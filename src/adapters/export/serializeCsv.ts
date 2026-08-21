export interface CsvColumn {
  key: string;
  header?: string;
}

function escapeDelimitedValue(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) return "";

  const text = value instanceof Date ? value.toISOString() : String(value);
  if (!text.includes(delimiter) && !/["\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function cellValue(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function serializeDelimited<T extends object>(
  columns: readonly CsvColumn[],
  rows: readonly T[],
  delimiter: "," | ";" | "\t",
): string {
  const header = columns
    .map((column) => escapeDelimitedValue(column.header ?? column.key, delimiter))
    .join(delimiter);
  const body = rows.map((row) =>
    columns
      .map((column) => escapeDelimitedValue(cellValue(row, column.key), delimiter))
      .join(delimiter),
  );

  return [header, ...body].join("\r\n");
}

export function serializeCsv<T extends object>(
  columns: readonly CsvColumn[],
  rows: readonly T[],
): string {
  return serializeDelimited(columns, rows, ",");
}
