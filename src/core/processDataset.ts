import type {
  CanonicalLead,
  ColumnMapping,
  DataIssue,
  ProcessedDataset,
  ProcessingConfig,
  RawRow,
} from "./domain";
import { detectDuplicates } from "./deduplication";
import { normalizeRow } from "./normalization";
import { validateLead } from "./validation";

function issuesForRow(issues: DataIssue[], row: number): DataIssue[] {
  return issues.filter((issue) => issue.row === row);
}

function classifyLead(
  lead: CanonicalLead,
  issues: DataIssue[],
): "ready" | "review" | "blocked" {
  const rowIssues = issuesForRow(issues, lead.sourceRow);
  if (rowIssues.some((issue) => issue.severity === "error")) return "blocked";
  if (rowIssues.some((issue) => issue.severity === "warning")) return "review";
  return "ready";
}

export function processDataset(
  rows: RawRow[],
  mapping: ColumnMapping,
  config: ProcessingConfig,
): ProcessedDataset {
  const leads: CanonicalLead[] = [];
  const issues: DataIssue[] = [];

  rows.forEach((row, index) => {
    // Row 1 is assumed to contain headers in the source spreadsheet.
    const sourceRow = index + 2;
    const normalized = normalizeRow(row, mapping, sourceRow, config.defaults);
    leads.push(normalized.lead);
    issues.push(...normalized.issues);
    issues.push(...validateLead(normalized.lead, config));
  });

  const duplicates = detectDuplicates(leads);
  issues.push(...duplicates.issues);

  const ready: CanonicalLead[] = [];
  const review: CanonicalLead[] = [];
  const blocked: CanonicalLead[] = [];

  for (const lead of leads) {
    const classification = classifyLead(lead, issues);
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
      uniqueContacts: leads.length - duplicates.duplicateRows.size,
      readyRows: ready.length,
      reviewRows: review.length,
      blockedRows: blocked.length,
      duplicateRows: duplicates.duplicateRows.size,
      normalizedValues: issues.filter((issue) => issue.type === "normalization").length,
    },
  };
}
