import writeExcelFile from "write-excel-file/node";
import { describe, expect, it } from "vitest";
import { TableParseError } from "../../src/adapters/table/domain";
import { parseXlsxBytes } from "../../src/adapters/xlsx/parseXlsx";

async function buildWorkbookBytes(
  data: Array<Array<string | number | boolean | Date | null>>,
  sheet = "Leads",
): Promise<Uint8Array> {
  const buffer = await writeExcelFile(data, { sheet }).toBuffer();
  return new Uint8Array(buffer);
}

describe("XLSX ingestion adapter", () => {
  it("parses the first worksheet and preserves source headers", async () => {
    const bytes = await buildWorkbookBytes([
      ["Firstname", "Surname", "Organisation", "Business Email"],
      ["Alice", "Martin", "ACME", "alice@acme.com"],
      ["Bob", "Durand", "Contoso", "bob@contoso.com"],
    ]);

    const result = await parseXlsxBytes(bytes, "event-leads.xlsx");

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
    const bytes = await buildWorkbookBytes(
      [
        [null, null],
        ["First Name", "Email"],
        ["Alice", "alice@example.com"],
      ],
      "Export",
    );

    const result = await parseXlsxBytes(bytes);

    expect(result.columns).toEqual(["First Name", "Email"]);
    expect(result.rows).toEqual([{ "First Name": "Alice", Email: "alice@example.com" }]);
    expect(result.metadata.sheetName).toBe("Export");
  });

  it("rejects empty binary input", async () => {
    await expect(parseXlsxBytes(new Uint8Array())).rejects.toMatchObject({
      code: "EMPTY_FILE",
    });
  });

  it("rejects invalid XLSX bytes with a stable error code", async () => {
    const invalid = new TextEncoder().encode("not-an-xlsx-file");
    await expect(parseXlsxBytes(invalid)).rejects.toMatchObject({
      code: "INVALID_XLSX",
    });
  });

  it("throws DemandLint parsing errors", async () => {
    await expect(parseXlsxBytes(new Uint8Array())).rejects.toBeInstanceOf(TableParseError);
  });
});
