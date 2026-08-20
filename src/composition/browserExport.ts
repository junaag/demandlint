import { downloadTextFile } from "../adapters/browser/downloadTextFile";
import { serializeCsv, type CsvColumn } from "../adapters/export/serializeCsv";
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

export function downloadCleanCsv(
  result: ProcessedDataset,
  exportMode: ContactExportMode = "all",
): void {
  const csv = serializeCsv(cleanColumns(exportMode), buildCleanExportRows(result));
  downloadTextFile("clean.csv", csv);
}

export function downloadReviewCsv(result: ProcessedDataset): void {
  const csv = serializeCsv(REVIEW_COLUMNS, buildReviewExportRows(result));
  downloadTextFile("review.csv", csv);
}
