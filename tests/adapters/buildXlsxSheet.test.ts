import readXlsxFile from "read-excel-file/node";
import { describe, expect, it } from "vitest";
import writeXlsxFile from "write-excel-file/node";
import {
  buildXlsxColumnWidths,
  buildXlsxSheetData,
} from "../../src/adapters/export/buildXlsxSheet";

describe("XLSX export", () => {
  it("writes a valid workbook with ordered headers and values", async () => {
    const columns = [
      { key: "firstName", header: "First name" },
      { key: "email" },
    ];
    const rows = [
      { firstName: "Ada", email: "ada@example.com" },
      { firstName: "Grace", email: "grace@example.com" },
    ];
    const sheetData = buildXlsxSheetData(columns, rows);
    const buffer = await writeXlsxFile(sheetData, {
      sheet: "Clean",
      columns: buildXlsxColumnWidths(columns, rows),
      stickyRowsCount: 1,
    }).toBuffer();

    await expect(readXlsxFile(buffer)).resolves.toEqual([
      {
        sheet: "Clean",
        data: [
          ["First name", "email"],
          ["Ada", "ada@example.com"],
          ["Grace", "grace@example.com"],
        ],
      },
    ]);
  });

  it("caps column widths for long review messages", () => {
    const widths = buildXlsxColumnWidths(
      [{ key: "_quality_issue" }],
      [{ _quality_issue: "A".repeat(200) }],
    );
    expect(widths).toEqual([{ width: 48 }]);
  });
});
