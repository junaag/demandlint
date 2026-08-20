import {
  buildXlsxColumnWidths,
  buildXlsxSheetData,
} from "../export/buildXlsxSheet";
import type { CsvColumn } from "../export/serializeCsv";

export async function downloadXlsxFile<T extends object>(
  fileName: string,
  sheetName: string,
  columns: readonly CsvColumn[],
  rows: readonly T[],
): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const spreadsheet = writeXlsxFile(
    buildXlsxSheetData(columns, rows),
    {
      sheet: sheetName,
      columns: buildXlsxColumnWidths(columns, rows),
      stickyRowsCount: 1,
      showGridLines: false,
      zoomScale: 0.9,
    },
  );

  await spreadsheet.toFile(fileName);
}
