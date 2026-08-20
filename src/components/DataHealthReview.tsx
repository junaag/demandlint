import { useMemo, useState } from "react";
import {
  buildQualityReview,
  countIssueTypes,
  filterQualityRows,
  type QualityStatus,
} from "../application/qualityReview";
import type {
  ContactPreferences,
  DataIssue,
  IssueType,
  ProcessedDataset,
} from "../application/public";
import { downloadCleanCsv, downloadReviewCsv } from "../composition/browserExport";
import "./DataHealthReview.css";

interface DataHealthReviewProps {
  result: ProcessedDataset;
  contactPreferences: ContactPreferences;
}

type StatusFilter = QualityStatus | "all";
type IssueFilter = IssueType | "all";

const ISSUE_LABELS: Record<IssueType, string> = {
  missing: "Missing",
  invalid: "Invalid",
  duplicate: "Duplicate",
  warning: "Warning",
  normalization: "Normalization",
};

function statusLabel(status: QualityStatus): string {
  if (status === "ready") return "Ready";
  if (status === "review") return "Review";
  return "Blocked";
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  return String(value);
}

function IssueEvidence({ issue }: { issue: DataIssue }) {
  const hasEvidence = issue.originalValue !== undefined || issue.proposedValue !== undefined;

  return (
    <div className={`issue-item issue-${issue.severity}`}>
      <div className="issue-heading">
        <span className="issue-type">{ISSUE_LABELS[issue.type]}</span>
        {issue.field && <span className="issue-field">{issue.field}</span>}
      </div>
      <p>{issue.message}</p>
      {hasEvidence && (
        <div className="issue-evidence">
          {issue.originalValue !== undefined && (
            <span><b>From</b> {displayValue(issue.originalValue)}</span>
          )}
          {issue.proposedValue !== undefined && (
            <span><b>To</b> {displayValue(issue.proposedValue)}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function DataHealthReview({ result, contactPreferences }: DataHealthReviewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");

  const qualityRows = useMemo(() => buildQualityReview(result), [result]);
  const issueCounts = useMemo(() => countIssueTypes(qualityRows), [qualityRows]);
  const filteredRows = useMemo(
    () => filterQualityRows(qualityRows, statusFilter, issueFilter),
    [qualityRows, statusFilter, issueFilter],
  );

  const qualityScore = result.stats.totalRows === 0
    ? 0
    : Math.round((result.stats.readyRows / result.stats.totalRows) * 100);
  const reviewExportCount = result.stats.reviewRows + result.stats.blockedRows;

  return (
    <section className="data-health" aria-live="polite">
      <div className="panel health-summary-panel">
        <div className="health-heading">
          <div>
            <p className="section-label">DATA HEALTH</p>
            <h2>Import quality at a glance</h2>
            <p>Every non-ready row stays visible and exportable for review.</p>
          </div>
          <div className="quality-score" aria-label={`${qualityScore}% CRM ready`}>
            <strong>{qualityScore}%</strong>
            <span>CRM ready</span>
          </div>
        </div>

        <div className="health-metrics">
          <div><strong>{result.stats.totalRows}</strong><span>Rows checked</span></div>
          <div><strong>{result.stats.uniqueContacts}</strong><span>Unique contacts</span></div>
          <div className="metric-ready"><strong>{result.stats.readyRows}</strong><span>Ready</span></div>
          <div className="metric-review"><strong>{result.stats.reviewRows}</strong><span>Review</span></div>
          <div className="metric-blocked"><strong>{result.stats.blockedRows}</strong><span>Blocked</span></div>
          <div><strong>{result.stats.duplicateRows}</strong><span>Duplicates</span></div>
          <div><strong>{result.stats.normalizedValues}</strong><span>Normalizations</span></div>
        </div>
      </div>

      <div className="panel review-panel">
        <div className="review-toolbar">
          <div>
            <p className="section-label">ROW REVIEW</p>
            <h2>Understand every quality decision</h2>
          </div>
          <div className="filter-group">
            <div className="status-filters" role="group" aria-label="Row status filter">
              {([
                ["all", "All", result.stats.totalRows],
                ["ready", "Ready", result.stats.readyRows],
                ["review", "Review", result.stats.reviewRows],
                ["blocked", "Blocked", result.stats.blockedRows],
              ] as const).map(([value, label, count]) => (
                <button
                  type="button"
                  key={value}
                  className={`filter-button ${statusFilter === value ? "active" : ""}`}
                  onClick={() => setStatusFilter(value)}
                >
                  {label} <span>{count}</span>
                </button>
              ))}
            </div>
            <label className="issue-filter-label">
              <span>Issue type</span>
              <select
                value={issueFilter}
                onChange={(event) => setIssueFilter(event.target.value as IssueFilter)}
              >
                <option value="all">All issues</option>
                {(Object.keys(ISSUE_LABELS) as IssueType[]).map((type) => (
                  <option key={type} value={type}>
                    {ISSUE_LABELS[type]} ({issueCounts[type]})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="review-list">
          {filteredRows.length === 0 ? (
            <div className="empty-review">No rows match the selected filters.</div>
          ) : filteredRows.map((row) => {
            const name = [row.lead.firstName, row.lead.lastName].filter(Boolean).join(" ") || "Unnamed contact";
            return (
              <article className="quality-row" key={row.lead.recordId}>
                <div className="quality-row-summary">
                  <span className={`status-badge status-${row.status}`}>{statusLabel(row.status)}</span>
                  <div className="contact-summary">
                    <strong>{name}</strong>
                    <span>{row.lead.email ?? "No email"}</span>
                    <span>{row.lead.phone ?? "No phone"}</span>
                  </div>
                  <div className="company-summary">
                    <strong>{row.lead.company ?? "No company"}</strong>
                    <span>{row.lead.provenance.sourceName} · row {row.lead.provenance.rowNumber}</span>
                  </div>
                </div>
                <div className="quality-row-issues">
                  {row.issues.length === 0 ? (
                    <div className="no-issues">No quality issues detected.</div>
                  ) : row.issues.map((issue) => (
                    <IssueEvidence issue={issue} key={issue.id} />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="panel export-panel">
        <div>
          <p className="section-label">EXPORT</p>
          <h2>Download CRM-ready data without losing exceptions</h2>
          <p>
            <code>clean.csv</code> contains Ready rows only. <code>review.csv</code> keeps every
            Review and Blocked row with its source, record identity and quality explanation.
          </p>
        </div>
        <div className="export-actions">
          <button
            className="button primary"
            type="button"
            onClick={() => downloadCleanCsv(result, contactPreferences.exportMode)}
            disabled={result.stats.readyRows === 0}
          >
            Download clean.csv <span>{result.stats.readyRows}</span>
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => downloadReviewCsv(result)}
            disabled={reviewExportCount === 0}
          >
            Download review.csv <span>{reviewExportCount}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
