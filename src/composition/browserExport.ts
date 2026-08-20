import { downloadTextFile } from "../adapters/browser/downloadTextFile";
import { serializeCsv, type CsvColumn } from "../adapters/export/serializeCsv";
import {
  buildCleanExportRows,
  buildReviewExportRows,
  CANONICAL_EXPORT_FIELDS,
  REVIEW_EXPORT_COLUMNS,
} from "../application/qualityReview";
import type { ProcessedDataset } from "../application/public";

const CLEAN_COLUMNS: CsvColumn[] = CANONICAL_EXPORT_FIELDS.map((field) => ({ key: field }));
const REVIEW_COLUMNS: CsvColumn[] = REVIEW_EXPORT_COLUMNS.map((field) => ({ key: field }));

export function downloadCleanCsv(result: ProcessedDataset): void {
  const csv = serializeCsv(CLEAN_COLUMNS, buildCleanExportRows(result));
  downloadTextFile("clean.csv", csv);
}

export function downloadReviewCsv(result: ProcessedDataset): void {
  const csv = serializeCsv(REVIEW_COLUMNS, buildReviewExportRows(result));
  downloadTextFile("review.csv", csv);
}
