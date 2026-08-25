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
});
