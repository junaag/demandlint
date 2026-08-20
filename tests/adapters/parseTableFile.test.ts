import writeExcelFile from "write-excel-file/node";
import { describe, expect, it } from "vitest";
import { TableParseError } from "../../src/adapters/table/domain";
import { parseTableFile } from "../../src/adapters/table/parseTableFile";

describe("table file dispatcher", () => {
  it("routes CSV files to the CSV adapter", async () => {
    const result = await parseTableFile({
      name: "event.csv",
      bytes: new TextEncoder().encode("First Name,Email\nAlice,alice@example.com"),
    });

    expect(result.metadata.sourceType).toBe("csv");
    expect(result.rows).toHaveLength(1);
  });

  it("routes XLSX files to the XLSX adapter", async () => {
    const buffer = await writeExcelFile(
      [
        ["First Name", "Email"],
        ["Alice", "alice@example.com"],
      ],
      { sheet: "Leads" },
    ).toBuffer();

    const result = await parseTableFile({
      name: "event.xlsx",
      bytes: new Uint8Array(buffer),
    });

    expect(result.metadata.sourceType).toBe("xlsx");
    expect(result.metadata.sheetName).toBe("Leads");
  });

  it("forwards a manual worksheet selection to the XLSX adapter", async () => {
    const buffer = await writeExcelFile(
      [
        { data: [["Metric", "Value"], ["Registrations", 42]], sheet: "Summary" },
        { data: [["First Name", "Email"], ["Alice", "alice@example.com"]], sheet: "Leads" },
      ],
    ).toBuffer();

    const result = await parseTableFile(
      { name: "event.xlsx", bytes: new Uint8Array(buffer) },
      { sheetName: "Summary" },
    );

    expect(result.metadata.sheetName).toBe("Summary");
    expect(result.metadata.sheetSelection).toBe("manual");
  });

  it("rejects unsupported file types explicitly", async () => {
    await expect(
      parseTableFile({
        name: "event.xls",
        bytes: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE_TYPE",
    });
  });

  it("throws a DemandLint parsing error for unsupported formats", async () => {
    await expect(
      parseTableFile({ name: "event.txt", bytes: new Uint8Array([1]) }),
    ).rejects.toBeInstanceOf(TableParseError);
  });
});
