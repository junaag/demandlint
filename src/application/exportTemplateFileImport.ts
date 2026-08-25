import type { CanonicalField } from "../core/domain";
import { canonicalizeHeader } from "../core/mapping/canonicalizeHeader";
import { suggestColumnMapping } from "../core/mapping/suggestColumnMapping";
import {
  CANONICAL_FIELD_OPTIONS,
  createExportTemplateDraft,
  templateColumnId,
  type ExportColumnSource,
  type ExportTemplate,
  type ExportValidationRule,
} from "./exportTemplates";

export type ExportTemplateFileType = "csv" | "xlsx" | "xls";
export type ExportTemplateDelimiter = "," | ";" | "\t";

export interface ExportTemplateHeaderRow {
  rowNumber: number;
  headers: string[];
  nonEmptyCount: number;
}

export interface ExportTemplateFileSheet {
  name: string;
  index: number;
  rowCount: number;
  columnCount: number;
  usable: boolean;
  headerRows: ExportTemplateHeaderRow[];
  preferredHeaderRowNumber?: number;
  requiresHeaderReview: boolean;
  columnValidations?: Record<number, { rules: ExportValidationRule[]; warnings?: string[] }>;
}

export interface ExportTemplateFileAnalysis {
  fileName: string;
  templateName: string;
  sourceType: ExportTemplateFileType;
  sheets: ExportTemplateFileSheet[];
  selectedSheetName?: string;
  requiresSheetSelection: boolean;
  delimiter?: ExportTemplateDelimiter;
}

export interface ExportTemplateDraftSelection {
  sheetName?: string;
  headerRowNumber?: number;
  organizationId?: string;
}

function exactKnownField(header: string): CanonicalField | undefined {
  return CANONICAL_FIELD_OPTIONS.find((option) => (
    header === option.value || header === option.label
  ))?.value;
}

function normalizedKnownField(header: string): CanonicalField | undefined {
  const normalized = canonicalizeHeader(header);
  if (!normalized) return undefined;
  const matches = CANONICAL_FIELD_OPTIONS.filter((option) => (
    canonicalizeHeader(option.value) === normalized || canonicalizeHeader(option.label) === normalized
  ));
  return matches.length === 1 ? matches[0]?.value : undefined;
}

function suggestedSources(headers: readonly string[]): ExportColumnSource[] {
  const plan = suggestColumnMapping(headers);
  return headers.map((header, index) => {
    if (!header.trim()) return { kind: "empty" };
    const knownField = exactKnownField(header) ?? normalizedKnownField(header);
    if (knownField) return { kind: "canonical", field: knownField };
    const suggestion = plan.suggestions[index];
    if (suggestion?.decision === "auto" && suggestion.selectedField) {
      return { kind: "canonical", field: suggestion.selectedField };
    }
    return { kind: "empty" };
  });
}

function selectedSheet(
  analysis: ExportTemplateFileAnalysis,
  selection: ExportTemplateDraftSelection,
): ExportTemplateFileSheet {
  const sheetName = selection.sheetName ?? analysis.selectedSheetName;
  const sheet = analysis.sheets.find((candidate) => candidate.name === sheetName && candidate.usable);
  if (!sheet) throw new Error("Choose a usable worksheet before creating the template draft.");
  return sheet;
}

function selectedHeaders(
  sheet: ExportTemplateFileSheet,
  selection: ExportTemplateDraftSelection,
): string[] {
  const rowNumber = selection.headerRowNumber ?? sheet.preferredHeaderRowNumber;
  const headerRow = sheet.headerRows.find((candidate) => candidate.rowNumber === rowNumber);
  if (!headerRow) throw new Error("Choose a header row before creating the template draft.");
  return headerRow.headers;
}

export function createExportTemplateDraftFromFileAnalysis(
  analysis: ExportTemplateFileAnalysis,
  selection: ExportTemplateDraftSelection = {},
): ExportTemplate {
  const sheet = selectedSheet(analysis, selection);
  const headers = selectedHeaders(sheet, selection);
  const sources = suggestedSources(headers);
  const defaultFormat = analysis.sourceType === "csv"
    ? analysis.delimiter === ";"
      ? "csv-semicolon"
      : analysis.delimiter === "\t"
        ? "tsv"
        : "csv"
    : analysis.sourceType;

  const importedColumns = headers.map((header, index) => {
    const source = sources[index] ?? { kind: "empty" } as ExportColumnSource;
    return {
      id: templateColumnId(),
      header: header.trim() ? header : `Column ${index + 1}`,
      source,
      format: "text" as const,
      ...(source.kind !== "empty" ? { emptyValueHandling: { kind: "leaveBlank" as const } } : {}),
      ...(sheet.columnValidations?.[index]?.rules.length ? { validationRules: sheet.columnValidations[index].rules } : {}),
      ...(sheet.columnValidations?.[index]?.warnings?.length ? { sourceValidationWarnings: sheet.columnValidations[index].warnings } : {}),
    };
  });
  const columns = importedColumns.map((column) => {
    const validationRules = column.validationRules?.map((rule) => {
      if ((rule.kind === "requiredWhen" || rule.kind === "dependentAllowedValues") && /^__column_\d+$/.test(rule.parentColumnId)) {
        const parent = importedColumns[Number(rule.parentColumnId.slice("__column_".length))];
        return parent ? { ...rule, parentColumnId: parent.id } : rule;
      }
      return rule;
    });
    return { ...column, ...(validationRules ? { validationRules } : {}) };
  });
  const draft = createExportTemplateDraft({
    name: analysis.templateName,
    destinationType: "",
    defaultFormat,
    ...(analysis.delimiter ? { delimiter: analysis.delimiter } : {}),
    ...(analysis.sourceType !== "csv" ? { sheetName: sheet.name } : {}),
    ...(selection.organizationId ? { organizationId: selection.organizationId } : {}),
    columns,
  });
  if (analysis.sourceType !== "csv") return draft;
  const { sheetName: _sheetName, ...csvDraft } = draft;
  return csvDraft;
}
