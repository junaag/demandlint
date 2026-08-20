import { downloadTextFile } from "../adapters/browser/downloadTextFile";
import { downloadXlsxFile } from "../adapters/browser/downloadXlsxFile";
import { serializeCsv, type CsvColumn } from "../adapters/export/serializeCsv";
import {
  buildExportFileName,
  type DataExportFormat,
} from "../application/exportFileName";
import {
  buildCleanExportRows,
  buildReviewExportRows,
  CANONICAL_EXPORT_FIELDS,
  REVIEW_EXPORT_COLUMNS,
} from "../application/qualityReview";
import type { ProcessedDataset } from "../application/public";
import type { ContactExportMode } from "../core/domain";

const TYPED_CONTACT_FIELDS = new Set([
  "emailProfessional",
  "emailSecondary",
  "emailPersonal",
  "phoneMobile",
  "phoneDirect",
  "phoneStandard",
]);

function cleanColumns(exportMode: ContactExportMode): CsvColumn[] {
  return CANONICAL_EXPORT_FIELDS
    .filter((field) => exportMode === "all" || !TYPED_CONTACT_FIELDS.has(field))
    .map((field) => ({ key: field }));
}

const REVIEW_COLUMNS: CsvColumn[] = REVIEW_EXPORT_COLUMNS.map((field) => ({ key: field }));

export async function downloadCleanExport(
  result: ProcessedDataset,
  exportMode: ContactExportMode = "all",
  format: DataExportFormat = "csv",
): Promise<void> {
  const columns = cleanColumns(exportMode);
  const rows = buildCleanExportRows(result);
  const fileName = buildExportFileName("clean", format);

  if (format === "xlsx") {
    await downloadXlsxFile(fileName, "Clean", columns, rows);
    return;
  }

  downloadTextFile(fileName, serializeCsv(columns, rows));
}

export async function downloadReviewExport(
  result: ProcessedDataset,
  format: DataExportFormat = "csv",
): Promise<void> {
  const rows = buildReviewExportRows(result);
  const fileName = buildExportFileName("review", format);

  if (format === "xlsx") {
    await downloadXlsxFile(fileName, "Review", REVIEW_COLUMNS, rows);
    return;
  }

  downloadTextFile(fileName, serializeCsv(REVIEW_COLUMNS, rows));
}
