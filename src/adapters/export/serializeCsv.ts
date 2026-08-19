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

export function serializeCsv(
  columns: readonly CsvColumn[],
  rows: readonly Record<string, unknown>[],
): string {
  const header = columns.map((column) => escapeCsvValue(column.header ?? column.key)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column.key])).join(","),
  );

  return [header, ...body].join("\r\n");
}
