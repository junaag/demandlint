import { downloadTextFile } from "../adapters/browser/downloadTextFile";
import { downloadXlsxFile } from "../adapters/browser/downloadXlsxFile";
import { downloadXlsFile } from "../adapters/browser/downloadXlsFile";
import { serializeDelimited, type CsvColumn } from "../adapters/export/serializeCsv";
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
import {
  buildTemplateExport,
  type ExportParameterValues,
  type ExportTemplate,
} from "../application/exportTemplates";

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

function delimiterFor(format: DataExportFormat, fallback: "," | ";" | "\t" = ","): "," | ";" | "\t" {
  if (format === "tsv") return "\t";
  if (format === "csv-semicolon") return ";";
  return fallback;
}

async function downloadRows<T extends object>(
  fileName: string,
  sheetName: string,
  columns: readonly CsvColumn[],
  rows: readonly T[],
  format: DataExportFormat,
  delimiter: "," | ";" | "\t" = ",",
): Promise<void> {
  if (format === "xlsx") {
    await downloadXlsxFile(fileName, sheetName, columns, rows);
    return;
  }
  if (format === "xls") {
    await downloadXlsFile(fileName, sheetName, columns, rows);
    return;
  }
  const actualDelimiter = delimiterFor(format, delimiter);
  downloadTextFile(
    fileName,
    serializeDelimited(columns, rows, actualDelimiter),
    actualDelimiter === "\t" ? "text/tab-separated-values;charset=utf-8" : "text/csv;charset=utf-8",
  );
}

export async function downloadCleanExport(
  result: ProcessedDataset,
  exportMode: ContactExportMode = "all",
  format: DataExportFormat = "csv",
): Promise<void> {
  const columns = cleanColumns(exportMode);
  const rows = buildCleanExportRows(result);
  const fileName = buildExportFileName("clean", format);

  await downloadRows(fileName, "Clean", columns, rows, format);
}

export async function downloadReviewExport(
  result: ProcessedDataset,
  format: DataExportFormat = "csv",
): Promise<void> {
  const rows = buildReviewExportRows(result);
  const fileName = buildExportFileName("review", format);

  await downloadRows(fileName, "Review", REVIEW_COLUMNS, rows, format);
}

export async function downloadTemplateExport(
  result: ProcessedDataset,
  template: ExportTemplate,
  parameters: ExportParameterValues,
  format: DataExportFormat,
): Promise<void> {
  const output = buildTemplateExport(template, result.ready, parameters);
  if (output.issues.some((issue) => issue.outcome !== "review")) {
    throw new Error(output.issues[0]?.message ?? "The export template is not valid.");
  }
  const fileName = buildExportFileName("clean", format);
  await downloadRows(
    fileName,
    template.sheetName?.trim() || "Clean",
    output.columns,
    output.rows,
    format,
    template.delimiter ?? ",",
  );
}
