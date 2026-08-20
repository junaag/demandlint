import type {
  CanonicalField,
  CanonicalLead,
  ColumnMapping,
  DataIssue,
  DatasetSource,
  RawRow,
} from "./domain";
import { createRecordId, createRecordProvenance, DEFAULT_DATASET_SOURCE } from "./provenance";

const EMPTY_TOKENS = new Set(["", "n/a", "na", "null", "-", "--", "unknown"]);

export function normalizeText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  const normalized = String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

  if (EMPTY_TOKENS.has(normalized.toLowerCase())) return undefined;
  return normalized;
}

export function normalizeEmail(value: unknown): string | undefined {
  return normalizeText(value)?.toLowerCase();
}

function normalizeField(field: CanonicalField, value: unknown): string | undefined {
  if (field === "email") return normalizeEmail(value);
  return normalizeText(value);
}

export interface NormalizationResult {
  lead: CanonicalLead;
  issues: DataIssue[];
}

export function normalizeRow(
  row: RawRow,
  mapping: ColumnMapping,
  sourceRow: number,
  defaults: Partial<Omit<CanonicalLead, "recordId" | "provenance" | "sourceRow" | "customFields">> = {},
  source: DatasetSource = DEFAULT_DATASET_SOURCE,
): NormalizationResult {
  const provenance = createRecordProvenance(source, sourceRow);
  const recordId = createRecordId(provenance);
  const lead: CanonicalLead = {
    recordId,
    provenance,
    sourceRow,
  };
  const issues: DataIssue[] = [];

  for (const [sourceColumn, targetField] of Object.entries(mapping)) {
    if (targetField === "ignore") continue;

    const originalValue = row[sourceColumn];
    const normalizedValue = normalizeField(targetField, originalValue);

    if (normalizedValue !== undefined) {
      lead[targetField] = normalizedValue;
    }

    const originalText = originalValue === null || originalValue === undefined
      ? undefined
      : String(originalValue);

    if (originalText !== undefined && originalText !== normalizedValue) {
      issues.push({
        id: `${recordId}:${targetField}:normalization`,
        recordId,
        provenance,
        row: sourceRow,
        field: targetField,
        type: "normalization",
        severity: "info",
        message: `${targetField} was normalized`,
        originalValue,
        proposedValue: normalizedValue ?? "",
      });
    }
  }

  for (const [field, value] of Object.entries(defaults) as [CanonicalField, string | undefined][]) {
    if (lead[field] === undefined && value !== undefined) {
      lead[field] = value;
    }
  }

  return { lead, issues };
}
