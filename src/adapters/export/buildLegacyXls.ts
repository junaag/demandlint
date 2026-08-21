import type { CsvColumn } from "./serializeCsv";

const XLS_MAX_ROWS = 65_536;
const XLS_MAX_COLUMNS = 256;

function cellValue(row: object, key: string): unknown {
  const value = (row as Record<string, unknown>)[key];
  if (value === undefined) return null;
  if (value instanceof Date || ["string", "number", "boolean"].includes(typeof value)) return value;
  return value === null ? null : String(value);
}

export function assertLegacyXlsLimits(columnCount: number, dataRowCount: number): void {
  if (columnCount > XLS_MAX_COLUMNS) {
    throw new Error(`Legacy XLS supports at most ${XLS_MAX_COLUMNS} columns. Choose XLSX or a delimited format.`);
  }
  if (dataRowCount + 1 > XLS_MAX_ROWS) {
    throw new Error(`Legacy XLS supports at most ${(XLS_MAX_ROWS - 1).toLocaleString("en-US")} data rows. Choose XLSX or a delimited format.`);
  }
}

export async function buildLegacyXlsBytes<T extends object>(
  sheetName: string,
  columns: readonly CsvColumn[],
  rows: readonly T[],
): Promise<Uint8Array> {
  assertLegacyXlsLimits(columns.length, rows.length);
  const XLSX = await import("xlsx");
  const data = [
    columns.map((item) => item.header ?? item.key),
    ...rows.map((row) => columns.map((item) => cellValue(row, item.key))),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(data, { cellDates: true });
  worksheet["!cols"] = columns.map((item) => ({ wch: Math.min(48, Math.max(12, (item.header ?? item.key).length + 2)) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || "Export");
  const output = XLSX.write(workbook, { type: "array", bookType: "biff8", cellDates: true });
  return output instanceof Uint8Array ? output : new Uint8Array(output as ArrayBuffer);
}
