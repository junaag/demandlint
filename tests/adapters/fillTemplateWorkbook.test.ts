import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { fillTemplateWorkbookBytes, normalizeWorkbookTemplateBytes } from "../../src/adapters/export/fillTemplateWorkbook";
import type { ExportTemplate } from "../../src/application/exportTemplates";
import type { CanonicalLead } from "../../src/core/domain";

function bytes(value: ArrayBuffer): Uint8Array { return new Uint8Array(value); }

async function masterWorkbook(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const instructions = workbook.addWorksheet("Instructions");
  instructions.getCell("A1").value = "Do not remove this sheet";
  const target = workbook.addWorksheet("Import");
  workbook.addWorksheet("Reference").getCell("A1").value = "Reference value";
  target.getCell("F1").value = "Keep outside import zone";
  ["Email", "Campaign", "Reserved", "Event date"].forEach((header, index) => {
    const cell = target.getCell(2, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4058C5" } };
  });
  target.getColumn(1).width = 32;
  target.getCell("A3").value = "old@example.test";
  target.getCell("B3").value = "Old campaign";
  target.getCell("C3").value = "old reserved";
  target.getCell("D3").value = "01/01/2020";
  target.getCell("A4").value = "residual@example.test";
  target.getCell("B4").value = "Residual campaign";
  target.getCell("A3").font = { italic: true, color: { argb: "FF263146" } };
  target.getCell("A3").dataValidation = { type: "list", allowBlank: true, formulae: ['"Allowed,Other"'] };
  target.getCell("F3").value = { formula: "COUNTA(A3:D3)", result: 4 };
  const output = await workbook.xlsx.writeBuffer();
  return bytes(output as ArrayBuffer);
}

const template: ExportTemplate = {
  id: "template-1",
  organizationId: "00000000-0000-4000-8000-000000000001",
  name: "Stored workbook",
  destinationType: "CRM",
  defaultFormat: "xlsx",
  workbook: {
    storagePath: "org/template/master.xlsx",
    originalFileName: "Marketo_bulk_import.xlsx",
    originalFileType: "xlsx",
    storedFileType: "xlsx",
    targetSheet: "Import",
    headerRow: 2,
    firstDataRow: 3,
  },
  columns: [
    { id: "email", header: "Email", source: { kind: "canonical", field: "email" }, emptyValueHandling: { kind: "required" } },
    { id: "campaign", header: "Campaign", source: { kind: "fixed" }, emptyValueHandling: { kind: "required" } },
    { id: "reserved", header: "Reserved", source: { kind: "empty" } },
    { id: "date", header: "Event date", source: { kind: "custom", key: "eventDate" }, format: "date", datePattern: "dd/MM/yyyy", emptyValueHandling: { kind: "leaveBlank" } },
  ],
};

const lead: CanonicalLead = {
  recordId: "lead-1",
  provenance: { sourceId: "source", sourceName: "leads.csv", rowNumber: 2 },
  sourceRow: 2,
  email: "alice@example.test",
  customFields: { eventDate: "2026-08-27" },
};

describe("fill template workbook", () => {
  it("normalizes a legacy XLS master to XLSX without changing existing XLS import support", async () => {
    const XLSX = await import("xlsx");
    const legacy = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(legacy, XLSX.utils.aoa_to_sheet([["Email"], ["old@example.test"]]), "Import");
    const legacyBytes = new Uint8Array(XLSX.write(legacy, { type: "array", bookType: "biff8" }) as ArrayBuffer);
    const normalized = await normalizeWorkbookTemplateBytes(legacyBytes, "xls");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes(normalized.buffer as ArrayBuffer) as unknown as ExcelJS.Buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Import"]);
    expect(workbook.getWorksheet("Import")!.getCell("A2").value).toBe("old@example.test");
  });

  it("fills only the configured data area and preserves workbook structure", async () => {
    const master = await masterWorkbook();
    const filled = await fillTemplateWorkbookBytes(master, template, [lead], { campaign: "August launch" });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes(filled.buffer as ArrayBuffer) as unknown as ExcelJS.Buffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Instructions", "Import", "Reference"]);
    expect(workbook.getWorksheet("Instructions")!.getCell("A1").value).toBe("Do not remove this sheet");
    expect(workbook.getWorksheet("Reference")!.getCell("A1").value).toBe("Reference value");
    const target = workbook.getWorksheet("Import")!;
    expect(["A3", "B3", "C3", "D3"].map((address) => target.getCell(address).value)).toEqual([
      "alice@example.test", "August launch", "", "27/08/2026",
    ]);
    expect(target.getCell("A4").value).toBeNull();
    expect(target.getCell("B4").value).toBeNull();
    expect(target.getCell("F1").value).toBe("Keep outside import zone");
    expect(target.getCell("F3").value).toMatchObject({ formula: "COUNTA(A3:D3)" });
    expect(target.getColumn(1).width).toBe(32);
    expect(target.getCell("A3").font.italic).toBe(true);
    expect(target.getCell("A3").dataValidation.type).toBe("list");

    const original = new ExcelJS.Workbook();
    await original.xlsx.load(bytes(master.buffer as ArrayBuffer) as unknown as ExcelJS.Buffer);
    expect(original.getWorksheet("Import")!.getCell("A3").value).toBe("old@example.test");
  });
});
