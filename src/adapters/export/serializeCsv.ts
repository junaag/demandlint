export interface CsvColumn {
  key: string;
  header?: string;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function cellValue(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function serializeCsv<T extends object>(
  columns: readonly CsvColumn[],
  rows: readonly T[],
): string {
  const header = columns.map((column) => escapeCsvValue(column.header ?? column.key)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(cellValue(row, column.key))).join(","),
  );

  return [header, ...body].join("\r\n");
}
