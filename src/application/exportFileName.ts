export type DataExportKind = "clean" | "review";
export type DataExportFormat = "csv" | "csv-semicolon" | "tsv" | "xlsx" | "xls";

export function exportFileExtension(format: DataExportFormat): "csv" | "tsv" | "xlsx" | "xls" {
  return format === "csv-semicolon" ? "csv" : format;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatExportTimestamp(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
}

export function buildExportFileName(
  kind: DataExportKind,
  format: DataExportFormat,
  exportedAt = new Date(),
): string {
  return `${kind}-${formatExportTimestamp(exportedAt)}.${exportFileExtension(format)}`;
}
