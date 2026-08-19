import ExcelJS from "exceljs";
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
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Leads");
    worksheet.addRow(["First Name", "Email"]);
    worksheet.addRow(["Alice", "alice@example.com"]);

    const result = await parseTableFile({
      name: "event.xlsx",
      bytes: new Uint8Array(await workbook.xlsx.writeBuffer()),
    });

    expect(result.metadata.sourceType).toBe("xlsx");
    expect(result.metadata.sheetName).toBe("Leads");
  });

  it("rejects unsupported file types explicitly", async () => {
    await expect(
      parseTableFile({
        name: "event.xls",
        bytes: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject<TableParseError>({
      code: "UNSUPPORTED_FILE_TYPE",
    });
  });
});
