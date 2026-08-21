import { buildLegacyXlsBytes } from "../export/buildLegacyXls";
import type { CsvColumn } from "../export/serializeCsv";

export async function downloadXlsFile<T extends object>(
  fileName: string,
  sheetName: string,
  columns: readonly CsvColumn[],
  rows: readonly T[],
): Promise<void> {
  const bytes = await buildLegacyXlsBytes(sheetName, columns, rows);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
