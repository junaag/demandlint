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

async function buildMultiSheetWorkbookBytes(
  sheets: Array<{
    name: string;
    data: Array<Array<string | number | boolean | Date | null>>;
  }>,
): Promise<Uint8Array> {
  const buffer = await writeExcelFile(
    sheets.map((sheet) => ({ data: sheet.data, sheet: sheet.name })),
  ).toBuffer();
  return new Uint8Array(buffer);
}

describe("XLSX ingestion adapter", () => {
  it("parses a single worksheet and preserves source headers", async () => {
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
      sheetSelection: "automatic",
    });
  });

  it("automatically selects the lead worksheet in a multi-sheet workbook", async () => {
    const bytes = await buildMultiSheetWorkbookBytes([
      {
        name: "TdB",
        data: [
          ["Campaign dashboard"],
          ["Start date", "2026-06-10"],
          ["Total contacts", 160],
        ],
      },
      {
        name: "Leads online",
        data: [
          ["Société", "Prénom", "Nom", "Fonction", "Mobile", "Email"],
          ["BASTIDE", "Amaury", "PRUNIER", "DSI", "06 40 11 25 43", "amaury@example.com"],
          ["NICOLLIN", "Bruno", "LOBATO", "DSI", "06 40 11 25 44", "bruno@example.com"],
        ],
      },
      {
        name: "Statistiques",
        data: [
          ["Newsletter", "Delivered", "Open rate"],
          ["Newsletter LMI", 160, "42%"],
        ],
      },
    ]);

    const result = await parseXlsxBytes(bytes, "TDB_UIPATH.xlsx");

    expect(result.metadata.sheetName).toBe("Leads online");
    expect(result.metadata.sheetSelection).toBe("automatic");
    expect(result.rows).toHaveLength(2);
    expect(result.columns).toContain("Email");
    expect(result.metadata.workbookSheets?.map((sheet) => sheet.name)).toEqual([
      "TdB",
      "Leads online",
      "Statistiques",
    ]);
    expect(result.warnings).toContain(
      "Automatically selected worksheet 'Leads online' from 3 worksheets.",
    );
  });

  it("allows a user-selected worksheet to override automatic selection", async () => {
    const bytes = await buildMultiSheetWorkbookBytes([
      {
        name: "Summary",
        data: [
          ["Metric", "Value"],
          ["Registrations", 42],
        ],
      },
      {
        name: "Leads",
        data: [
          ["First Name", "Last Name", "Company", "Email"],
          ["Alice", "Martin", "ACME", "alice@acme.example"],
        ],
      },
    ]);

    const result = await parseXlsxBytes(bytes, "event.xlsx", { sheetName: "Summary" });

    expect(result.metadata.sheetName).toBe("Summary");
    expect(result.metadata.sheetSelection).toBe("manual");
    expect(result.columns).toEqual(["Metric", "Value"]);
    expect(result.rows).toEqual([{ Metric: "Registrations", Value: 42 }]);
  });

  it("finds a recognized header below a worksheet title", async () => {
    const bytes = await buildWorkbookBytes([
      ["Q1 campaign export"],
      [null],
      ["First Name", "Last Name", "Company", "Email"],
      ["Alice", "Martin", "ACME", "alice@acme.example"],
    ]);

    const result = await parseXlsxBytes(bytes);

    expect(result.metadata.headerRowNumber).toBe(3);
    expect(result.rows).toHaveLength(1);
  });

  it("rejects an unknown manually selected worksheet", async () => {
    const bytes = await buildWorkbookBytes([
      ["First Name", "Email"],
      ["Alice", "alice@example.com"],
    ]);

    await expect(parseXlsxBytes(bytes, "event.xlsx", { sheetName: "Missing" }))
      .rejects.toMatchObject({ code: "UNKNOWN_SHEET" });
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
