import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { TableParseError } from "../../src/adapters/table/domain";
import { parseXlsxBytes } from "../../src/adapters/xlsx/parseXlsx";

async function buildWorkbookBytes(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Leads");
  worksheet.addRow(["Firstname", "Surname", "Organisation", "Business Email"]);
  worksheet.addRow(["Alice", "Martin", "ACME", "alice@acme.com"]);
  worksheet.addRow(["Bob", "Durand", "Contoso", "bob@contoso.com"]);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

describe("XLSX ingestion adapter", () => {
  it("parses the first worksheet and preserves source headers", async () => {
    const result = await parseXlsxBytes(await buildWorkbookBytes(), "event-leads.xlsx");

    expect(result.columns).toEqual(["Firstname", "Surname", "Organisation", "Business Email"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.Organisation).toBe("ACME");
    expect(result.rows[1]?.["Business Email"]).toBe("bob@contoso.com");
    expect(result.metadata).toMatchObject({
      fileName: "event-leads.xlsx",
      sourceType: "xlsx",
      rowCount: 2,
      columnCount: 4,
      sheetName: "Leads",
    });
  });

  it("uses the first non-empty row as the header row", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Export");
    worksheet.addRow([]);
    worksheet.addRow(["First Name", "Email"]);
    worksheet.addRow(["Alice", "alice@example.com"]);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());

    const result = await parseXlsxBytes(bytes);

    expect(result.columns).toEqual(["First Name", "Email"]);
    expect(result.rows).toEqual([{ "First Name": "Alice", Email: "alice@example.com" }]);
  });

  it("rejects empty binary input", async () => {
    await expect(parseXlsxBytes(new Uint8Array())).rejects.toMatchObject<TableParseError>({
      code: "EMPTY_FILE",
    });
  });

  it("rejects invalid XLSX bytes with a stable error code", async () => {
    const invalid = new TextEncoder().encode("not-an-xlsx-file");
    await expect(parseXlsxBytes(invalid)).rejects.toMatchObject<TableParseError>({
      code: "INVALID_XLSX",
    });
  });
});
