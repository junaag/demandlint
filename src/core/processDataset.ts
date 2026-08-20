import type {
  CanonicalLead,
  ColumnMapping,
  DataIssue,
  DatasetSource,
  ProcessedDataset,
  ProcessingConfig,
  RawRow,
  RecordId,
} from "./domain";
import {
  detectDuplicates,
  type DuplicateDetectionStrategy,
} from "./deduplication";
import { normalizeRow } from "./normalization";
import { DEFAULT_DATASET_SOURCE } from "./provenance";
import { validateLead } from "./validation";

export type LeadValidationStrategy = (
  lead: CanonicalLead,
  config: ProcessingConfig,
) => DataIssue[];

export interface ProcessingStrategies {
  validate: LeadValidationStrategy;
  detectDuplicates: DuplicateDetectionStrategy;
}

export const DEFAULT_PROCESSING_STRATEGIES: ProcessingStrategies = {
  validate: validateLead,
  detectDuplicates,
};

function groupIssuesByRecord(issues: readonly DataIssue[]): Map<RecordId, DataIssue[]> {
  const grouped = new Map<RecordId, DataIssue[]>();

  for (const issue of issues) {
    const existing = grouped.get(issue.recordId) ?? [];
    existing.push(issue);
    grouped.set(issue.recordId, existing);
  }

  return grouped;
}

function classifyLead(
  lead: CanonicalLead,
  issuesByRecord: ReadonlyMap<RecordId, readonly DataIssue[]>,
): "ready" | "review" | "blocked" {
  const rowIssues = issuesByRecord.get(lead.recordId) ?? [];
  if (rowIssues.some((issue) => issue.severity === "error")) return "blocked";
  if (rowIssues.some((issue) => issue.severity === "warning")) return "review";
  return "ready";
}

export function processDataset(
  rows: RawRow[],
  mapping: ColumnMapping,
  config: ProcessingConfig,
  source: DatasetSource = DEFAULT_DATASET_SOURCE,
  strategies: ProcessingStrategies = DEFAULT_PROCESSING_STRATEGIES,
): ProcessedDataset {
  const leads: CanonicalLead[] = [];
  const issues: DataIssue[] = [];
  const headerRowNumber = source.headerRowNumber ?? 1;

  rows.forEach((row, index) => {
    const sourceRow = headerRowNumber + index + 1;
    const normalized = normalizeRow(
      row,
      mapping,
      sourceRow,
      config.defaults,
      source,
      config.contactPreferences,
    );
    leads.push(normalized.lead);
    issues.push(...normalized.issues);
    issues.push(...strategies.validate(normalized.lead, config));
  });

  const duplicates = strategies.detectDuplicates(leads);
  issues.push(...duplicates.issues);

  const issuesByRecord = groupIssuesByRecord(issues);
  const ready: CanonicalLead[] = [];
  const review: CanonicalLead[] = [];
  const blocked: CanonicalLead[] = [];

  for (const lead of leads) {
    const classification = classifyLead(lead, issuesByRecord);
    if (classification === "ready") ready.push(lead);
    else if (classification === "review") review.push(lead);
    else blocked.push(lead);
  }

  return {
    leads,
    issues,
    ready,
    review,
    blocked,
    stats: {
      totalRows: leads.length,
      uniqueContacts: leads.length - duplicates.duplicateRecordIds.size,
      readyRows: ready.length,
      reviewRows: review.length,
      blockedRows: blocked.length,
      duplicateRows: duplicates.duplicateRecordIds.size,
      normalizedValues: issues.filter((issue) => issue.type === "normalization").length,
    },
  };
}
