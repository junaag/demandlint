import type {
  CanonicalField,
  CanonicalLead,
  DataIssue,
  IssueType,
  ProcessedDataset,
  RecordId,
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
  "emailProfessional",
  "emailSecondary",
  "emailPersonal",
  "company",
  "jobTitle",
  "phone",
  "phoneMobile",
  "phoneDirect",
  "phoneStandard",
  "country",
  "leadSource",
  "campaignMemberStatus",
];

export const REVIEW_EXPORT_COLUMNS = [
  ...CANONICAL_EXPORT_FIELDS,
  "_quality_status",
  "_quality_issue",
  "_record_id",
  "_source_name",
  "_source_row",
] as const;

export type CanonicalExportRow = Record<CanonicalField, string>;

export type ReviewExportRow = CanonicalExportRow & {
  _quality_status: QualityStatus;
  _quality_issue: string;
  _record_id: string;
  _source_name: string;
  _source_row: string;
};

function recordSet(leads: readonly CanonicalLead[]): Set<RecordId> {
  return new Set(leads.map((lead) => lead.recordId));
}

function statusForRecord(
  recordId: RecordId,
  readyRecords: ReadonlySet<RecordId>,
  reviewRecords: ReadonlySet<RecordId>,
): QualityStatus {
  if (readyRecords.has(recordId)) return "ready";
  if (reviewRecords.has(recordId)) return "review";
  return "blocked";
}

export function buildQualityReview(result: ProcessedDataset): QualityReviewRow[] {
  const issuesByRecord = new Map<RecordId, DataIssue[]>();
  for (const issue of result.issues) {
    const recordIssues = issuesByRecord.get(issue.recordId) ?? [];
    recordIssues.push(issue);
    issuesByRecord.set(issue.recordId, recordIssues);
  }

  const readyRecords = recordSet(result.ready);
  const reviewRecords = recordSet(result.review);

  return result.leads.map((lead) => ({
    lead,
    status: statusForRecord(lead.recordId, readyRecords, reviewRecords),
    issues: issuesByRecord.get(lead.recordId) ?? [],
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
    emailProfessional: lead.emailProfessional ?? "",
    emailSecondary: lead.emailSecondary ?? "",
    emailPersonal: lead.emailPersonal ?? "",
    company: lead.company ?? "",
    jobTitle: lead.jobTitle ?? "",
    phone: lead.phone ?? "",
    phoneMobile: lead.phoneMobile ?? "",
    phoneDirect: lead.phoneDirect ?? "",
    phoneStandard: lead.phoneStandard ?? "",
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
      _record_id: row.lead.recordId,
      _source_name: row.lead.provenance.sourceName,
      _source_row: String(row.lead.provenance.rowNumber),
    }));
}
