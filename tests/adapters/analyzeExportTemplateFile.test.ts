import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { analyzeExportTemplateFile } from "../../src/adapters/template/analyzeExportTemplateFile";
import { createExportTemplateDraftFromFileAnalysis } from "../../src/application/exportTemplateFileImport";

function csvFile(text: string, name = "target.csv") {
  return { name, bytes: new TextEncoder().encode(text) };
}

function workbookFile(
  sheets: Array<{ name: string; rows: unknown[][] }>,
  sourceType: "xlsx" | "xls" = "xlsx",
) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet) => XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(sheet.rows),
    sheet.name,
  ));
  const bytes = XLSX.write(workbook, {
    type: "array",
    bookType: sourceType === "xls" ? "biff8" : "xlsx",
  }) as ArrayBuffer;
  return { name: `destination.${sourceType}`, bytes: new Uint8Array(bytes) };
}

function workbookWithValidations(
  sheets: Array<{ name: string; rows: unknown[][]; validationXml?: string }>,
  namedRanges: Record<string, string> = {},
) {
  const file = workbookFile(sheets);
  const cfb = XLSX.CFB.read(file.bytes, { type: "array" });
  sheets.forEach((sheet, index) => {
    if (!sheet.validationXml) return;
    const entry = XLSX.CFB.find(cfb, `Root Entry/xl/worksheets/sheet${index + 1}.xml`);
    if (!entry?.content) throw new Error("Test workbook worksheet is missing.");
    const xml = new TextDecoder().decode(entry.content);
    entry.content = new TextEncoder().encode(xml.replace("</worksheet>", `${sheet.validationXml}</worksheet>`));
  });
  if (Object.keys(namedRanges).length > 0) {
    const entry = XLSX.CFB.find(cfb, "Root Entry/xl/workbook.xml");
    if (!entry?.content) throw new Error("Test workbook metadata is missing.");
    const xml = new TextDecoder().decode(entry.content);
    const definitions = Object.entries(namedRanges).map(([name, reference]) => `<definedName name=\"${name}\">${reference}</definedName>`).join("");
    entry.content = new TextEncoder().encode(xml.replace("</workbook>", `<definedNames>${definitions}</definedNames></workbook>`));
  }
  return { ...file, bytes: new Uint8Array(XLSX.CFB.write(cfb, { type: "array", fileType: "zip" }) as ArrayBuffer) };
}

describe("export template file analyzer", () => {
  it("preserves CSV headers, order, structural blanks and a reliable delimiter", async () => {
    const analysis = await analyzeExportTemplateFile(csvFile(
      "Email Address;;Vendor status\nalice@example.test;;Registered\n",
      "event-target.csv",
    ));
    const draft = createExportTemplateDraftFromFileAnalysis(analysis);

    expect(analysis.delimiter).toBe(";");
    expect(analysis.sheets[0]?.headerRows[0]?.headers).toEqual([
      "Email Address", "", "Vendor status",
    ]);
    expect(draft.name).toBe("event-target");
    expect(draft.defaultFormat).toBe("csv-semicolon");
    expect(draft.delimiter).toBe(";");
    expect(draft.columns.map((column) => column.header)).toEqual([
      "Email Address", "Column 2", "Vendor status",
    ]);
    expect(draft.columns.map((column) => column.source)).toEqual([
      { kind: "canonical", field: "email" },
      { kind: "empty" },
      { kind: "empty" },
    ]);
    expect(draft.columns.every((column) => column.format === "text")).toBe(true);
    expect(draft).not.toHaveProperty("sheetName");
  });

  it("uses exact, normalized and deterministic high-confidence mappings only", async () => {
    const analysis = await analyzeExportTemplateFile(csvFile(
      "firstName,FIRSTNAME,Professional email,Unrecognized target\n",
    ));
    const draft = createExportTemplateDraftFromFileAnalysis(analysis);

    expect(draft.columns.map((column) => column.source)).toEqual([
      { kind: "canonical", field: "firstName" },
      { kind: "canonical", field: "firstName" },
      { kind: "canonical", field: "emailProfessional" },
      { kind: "empty" },
    ]);
  });

  it("keeps a single Excel worksheet name and structural column positions", async () => {
    const analysis = await analyzeExportTemplateFile(workbookFile([
      { name: "CRM upload", rows: [["Email", null, "Company"], ["a@example.test", null, "Acme"]] },
    ]));
    const draft = createExportTemplateDraftFromFileAnalysis(analysis);

    expect(analysis.selectedSheetName).toBe("CRM upload");
    expect(analysis.requiresSheetSelection).toBe(false);
    expect(draft.defaultFormat).toBe("xlsx");
    expect(draft.sheetName).toBe("CRM upload");
    expect(draft.columns.map((column) => column.header)).toEqual(["Email", "Column 2", "Company"]);
    expect(draft.columns[1]?.source).toEqual({ kind: "empty" });
  });

  it("requires explicit selection when several worksheets are plausible", async () => {
    const analysis = await analyzeExportTemplateFile(workbookFile([
      { name: "Summary", rows: [["Metric", "Value"], ["Registrations", 42]] },
      { name: "Destination", rows: [["Email", "First name"], ["a@example.test", "Alice"]] },
    ]));

    expect(analysis.sheets.map((sheet) => sheet.name)).toEqual(["Summary", "Destination"]);
    expect(analysis.requiresSheetSelection).toBe(true);
    expect(analysis.selectedSheetName).toBeUndefined();
    expect(() => createExportTemplateDraftFromFileAnalysis(analysis)).toThrow(/Choose a usable worksheet/);
    expect(createExportTemplateDraftFromFileAnalysis(analysis, { sheetName: "Summary" }).sheetName).toBe("Summary");
  });

  it("flags a lightweight header review when a title precedes the preferred row", async () => {
    const analysis = await analyzeExportTemplateFile(workbookFile([
      { name: "Upload", rows: [["CRM import layout"], ["Email", "Country"], ["", ""]] },
    ]));
    const sheet = analysis.sheets[0];

    expect(sheet?.preferredHeaderRowNumber).toBe(2);
    expect(sheet?.requiresHeaderReview).toBe(true);
    expect(sheet?.headerRows.map((row) => row.rowNumber)).toEqual([1, 2]);
  });

  it("supports legacy XLS without changing the selected worksheet", async () => {
    const analysis = await analyzeExportTemplateFile(workbookFile([
      { name: "Legacy target", rows: [["Email", "Company"], ["a@example.test", "Acme"]] },
    ], "xls"));
    const draft = createExportTemplateDraftFromFileAnalysis(analysis);

    expect(analysis.sourceType).toBe("xls");
    expect(draft.defaultFormat).toBe("xls");
    expect(draft.sheetName).toBe("Legacy target");
  });

  it("normalizes explicit and range-based list validations without truncating values", async () => {
    const values = Array.from({ length: 275 }, (_, index) => `Value ${index + 1}`);
    const analysis = await analyzeExportTemplateFile(workbookWithValidations([
      { name: "Target", rows: [["Choice", "Large"], ["", ""]], validationXml: "<dataValidations count=\"2\"><dataValidation type=\"list\" sqref=\"A2:A100\"><formula1>\"Yes,No\"</formula1></dataValidation><dataValidation type=\"list\" sqref=\"B2:B100\"><formula1>=Lists!$A$1:$A$275</formula1></dataValidation></dataValidations>" },
      { name: "Lists", rows: values.map((value) => [value]) },
    ]));
    const target = analysis.sheets.find((sheet) => sheet.name === "Target");
    expect(target?.columnValidations?.[0]?.rules).toEqual([{ kind: "allowedValues", outcome: "block", values: ["Yes", "No"] }]);
    expect((target?.columnValidations?.[1]?.rules[0] as { values: string[] }).values).toHaveLength(275);
  });

  it("normalizes two generic single-parent dependent dropdown patterns", async () => {
    const analysis = await analyzeExportTemplateFile(workbookWithValidations([
      { name: "Target", rows: [["Parent A", "Child A", "Parent B", "Child B"], ["", "", "", ""]], validationXml: "<dataValidations count=\"4\"><dataValidation type=\"list\" sqref=\"A2:A100\"><formula1>\"North,South\"</formula1></dataValidation><dataValidation type=\"list\" sqref=\"B2:B100\"><formula1>=INDIRECT($A2)</formula1></dataValidation><dataValidation type=\"list\" sqref=\"C2:C100\"><formula1>\"Online,Event\"</formula1></dataValidation><dataValidation type=\"list\" sqref=\"D2:D100\"><formula1>=INDIRECT($C2)</formula1></dataValidation></dataValidations>" },
      { name: "Lists", rows: [["N"], ["S"], ["O"], ["E"]] },
    ], { North: "Lists!$A$1:$A$1", South: "Lists!$A$2:$A$2", Online: "Lists!$A$3:$A$3", Event: "Lists!$A$4:$A$4" }));
    const target = analysis.sheets.find((sheet) => sheet.name === "Target");
    expect(target?.columnValidations?.[1]?.rules[0]?.kind).toBe("dependentAllowedValues");
    expect(target?.columnValidations?.[3]?.rules[0]?.kind).toBe("dependentAllowedValues");
  });

  it("surfaces unsupported structured validations instead of dropping them", async () => {
    const analysis = await analyzeExportTemplateFile(workbookWithValidations([
      { name: "Target", rows: [["Email"], [""]], validationXml: "<dataValidations count=\"1\"><dataValidation type=\"whole\" sqref=\"A2:A100\"><formula1>1</formula1></dataValidation></dataValidations>" },
    ]));
    expect(analysis.sheets[0]?.columnValidations?.[0]?.warnings?.[0]).toMatch(/needs review/);
  });
});
