import type { SheetData } from "write-excel-file/browser";
import type { CsvColumn } from "./serializeCsv";

function cellValue(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function spreadsheetValue(value: unknown): string | number | boolean | Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return String(value);
}

export function buildXlsxSheetData<T extends object>(
  columns: readonly CsvColumn[],
  rows: readonly T[],
): SheetData {
  const header = columns.map((column) => ({
    value: column.header ?? column.key,
    fontWeight: "bold" as const,
    backgroundColor: "#E8EDFF",
    textColor: "#263146",
    bottomBorderColor: "#B7C2E6",
    bottomBorderStyle: "thin" as const,
    alignVertical: "center" as const,
    wrap: true,
  }));

  return [
    header,
    ...rows.map((row) => columns.map((column) => spreadsheetValue(cellValue(row, column.key)))),
  ];
}

export function buildXlsxColumnWidths<T extends object>(
  columns: readonly CsvColumn[],
  rows: readonly T[],
): Array<{ width: number }> {
  const samples = rows.slice(0, 200);
  return columns.map((column) => {
    const headerLength = (column.header ?? column.key).length;
    const contentLength = samples.reduce((maximum, row) => {
      const value = cellValue(row, column.key);
      return Math.max(maximum, value === null || value === undefined ? 0 : String(value).length);
    }, 0);
    return { width: Math.min(48, Math.max(12, Math.max(headerLength, contentLength) + 2)) };
  });
}
