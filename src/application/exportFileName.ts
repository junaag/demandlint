export type DataExportKind = "clean" | "review";
export type DataExportFormat = "csv" | "xlsx";

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
  return `${kind}-${formatExportTimestamp(exportedAt)}.${format}`;
}
