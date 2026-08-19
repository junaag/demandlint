import type {
  CanonicalField,
  CanonicalLead,
  DataIssue,
  IssueType,
  ProcessedDataset,
} from "../core/domain";

export type QualityStatus = "ready" | "review" | "blocked";

export interface QualityReviewRow {
  lead: CanonicalLead;
  status: QualityStatus;
  issues: DataIssue[];
}

export const CANONICAL_EXPORT_FIELDS: readonly CanonicalField[] = [
  "firstName",
  "lastName",
  "email",
  "company",
  "jobTitle",
  "phone",
  "country",
  "leadSource",
  "campaignMemberStatus",
];

export const REVIEW_EXPORT_COLUMNS = [
  ...CANONICAL_EXPORT_FIELDS,
  "_quality_status",
  "_quality_issue",
  "_source_row",
] as const;

export type CanonicalExportRow = Record<CanonicalField, string>;

export type ReviewExportRow = CanonicalExportRow & {
  _quality_status: QualityStatus;
  _quality_issue: string;
  _source_row: string;
};

function rowSet(leads: readonly CanonicalLead[]): Set<number> {
  return new Set(leads.map((lead) => lead.sourceRow));
}

function statusForRow(
  sourceRow: number,
  readyRows: Set<number>,
  reviewRows: Set<number>,
): QualityStatus {
  if (readyRows.has(sourceRow)) return "ready";
  if (reviewRows.has(sourceRow)) return "review";
  return "blocked";
}

export function buildQualityReview(result: ProcessedDataset): QualityReviewRow[] {
  const issuesByRow = new Map<number, DataIssue[]>();
  for (const issue of result.issues) {
    const rowIssues = issuesByRow.get(issue.row) ?? [];
    rowIssues.push(issue);
    issuesByRow.set(issue.row, rowIssues);
  }

  const readyRows = rowSet(result.ready);
  const reviewRows = rowSet(result.review);

  return result.leads.map((lead) => ({
    lead,
    status: statusForRow(lead.sourceRow, readyRows, reviewRows),
    issues: issuesByRow.get(lead.sourceRow) ?? [],
  }));
}

export function countIssueTypes(rows: readonly QualityReviewRow[]): Record<IssueType, number> {
  const counts: Record<IssueType, number> = {
    missing: 0,
    invalid: 0,
    duplicate: 0,
    warning: 0,
    normalization: 0,
  };

  for (const row of rows) {
    for (const issue of row.issues) {
      counts[issue.type] += 1;
    }
  }

  return counts;
}

export function filterQualityRows(
  rows: readonly QualityReviewRow[],
  status: QualityStatus | "all",
  issueType: IssueType | "all",
): QualityReviewRow[] {
  return rows.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    if (issueType !== "all" && !row.issues.some((issue) => issue.type === issueType)) return false;
    return true;
  });
}

function canonicalExportRow(lead: CanonicalLead): CanonicalExportRow {
  return {
    firstName: lead.firstName ?? "",
    lastName: lead.lastName ?? "",
    email: lead.email ?? "",
    company: lead.company ?? "",
    jobTitle: lead.jobTitle ?? "",
    phone: lead.phone ?? "",
    country: lead.country ?? "",
    leadSource: lead.leadSource ?? "",
    campaignMemberStatus: lead.campaignMemberStatus ?? "",
  };
}

function issueSummary(issues: readonly DataIssue[]): string {
  return issues
    .filter((issue) => issue.severity !== "info")
    .map((issue) => {
      const field = issue.field ? `${issue.field}: ` : "";
      return `${field}${issue.message}`;
    })
    .join(" | ");
}

export function buildCleanExportRows(result: ProcessedDataset): CanonicalExportRow[] {
  return result.ready.map(canonicalExportRow);
}

export function buildReviewExportRows(result: ProcessedDataset): ReviewExportRow[] {
  return buildQualityReview(result)
    .filter((row) => row.status !== "ready")
    .map((row) => ({
      ...canonicalExportRow(row.lead),
      _quality_status: row.status,
      _quality_issue: issueSummary(row.issues),
      _source_row: String(row.lead.sourceRow),
    }));
}
