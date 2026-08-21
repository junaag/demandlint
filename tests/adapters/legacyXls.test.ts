import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildLegacyXlsBytes, assertLegacyXlsLimits } from "../../src/adapters/export/buildLegacyXls";
import { parseSpreadsheetBytes } from "../../src/adapters/xlsx/parseXlsx";

describe("legacy XLS support", () => {
  it("writes a true BIFF8 workbook that can be read again", async () => {
    const bytes = await buildLegacyXlsBytes(
      "Leads",
      [{ key: "email", header: "Email" }, { key: "score", header: "Score" }],
      [{ email: "alice@example.com", score: 42 }],
    );
    const workbook = XLSX.read(bytes, { type: "array" });
    expect(workbook.bookType).not.toBe("xlsx");
    expect(workbook.SheetNames).toEqual(["Leads"]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Leads!)).toEqual([
      { Email: "alice@example.com", Score: 42 },
    ]);
  });

  it("imports legacy XLS with sheet metadata", async () => {
    const bytes = await buildLegacyXlsBytes(
      "People",
      [{ key: "first", header: "First Name" }, { key: "email", header: "Email" }],
      [{ first: "Alice", email: "alice@example.com" }],
    );
    const table = await parseSpreadsheetBytes(bytes, "people.xls", "xls");
    expect(table.metadata).toMatchObject({ sourceType: "xls", sheetName: "People" });
    expect(table.rows).toEqual([{ "First Name": "Alice", Email: "alice@example.com" }]);
  });

  it("protects users from legacy XLS row and column limits", () => {
    expect(() => assertLegacyXlsLimits(257, 1)).toThrow(/256 columns/);
    expect(() => assertLegacyXlsLimits(2, 65_536)).toThrow(/65,535 data rows/);
  });
});
