import type {
  CanonicalField,
  ColumnMapping,
  MappingConfidence,
  MappingDecision,
  MappingPlan,
  ParsedTable,
} from "../application/public";

const FIELD_OPTIONS: { value: CanonicalField; label: string }[] = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email · Other/unspecified" },
  { value: "emailProfessional", label: "Email · Professional" },
  { value: "emailSecondary", label: "Email · Secondary" },
  { value: "emailPersonal", label: "Email · Personal" },
  { value: "company", label: "Company" },
  { value: "jobTitle", label: "Job Title" },
  { value: "phone", label: "Phone · Other/unspecified" },
  { value: "phoneMobile", label: "Phone · Mobile" },
  { value: "phoneDirect", label: "Phone · Direct line" },
  { value: "phoneStandard", label: "Phone · Switchboard" },
  { value: "country", label: "Country" },
  { value: "leadSource", label: "Lead Source" },
  { value: "campaignMemberStatus", label: "Campaign Member Status" },
];

const FIELD_LABELS = Object.fromEntries(
  FIELD_OPTIONS.map((option) => [option.value, option.label]),
) as Record<CanonicalField, string>;

function decisionLabel(decision: MappingDecision): string {
  if (decision === "auto") return "Auto mapped";
  if (decision === "review") return "Review";
  if (decision === "ambiguous") return "Ambiguous";
  return "No match";
}

function confidenceLabel(confidence?: MappingConfidence): string {
  if (!confidence) return "Unknown";
  return `${confidence[0]?.toUpperCase() ?? ""}${confidence.slice(1)}`;
}

function sampleValue(table: ParsedTable, sourceColumn: string): string {
  for (const row of table.rows.slice(0, 6)) {
    const value = row[sourceColumn];
    if (value !== null && value !== undefined && String(value).trim().length > 0) {
      const text = String(value);
      return text.length > 48 ? `${text.slice(0, 45)}…` : text;
    }
  }
  return "—";
}

interface MappingPanelProps {
  table: ParsedTable;
  plan: MappingPlan;
  mapping: ColumnMapping;
  onChange: (sourceColumn: string, target: CanonicalField | "ignore") => void;
}

export function MappingPanel({ table, plan, mapping, onChange }: MappingPanelProps) {
  return (
    <section className="panel mapping-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">FIELD MAPPING</p>
          <h2>Confirm how your columns should be interpreted</h2>
          <p>Only unique high-confidence matches are selected automatically.</p>
        </div>
        <div className="mapping-counts" aria-label="Mapping summary">
          <span><b>{plan.autoMappedCount}</b> auto</span>
          <span><b>{plan.reviewCount}</b> review</span>
          <span><b>{plan.ambiguousCount}</b> ambiguous</span>
        </div>
      </div>

      <div className="mapping-table" role="table" aria-label="Column mappings">
        <div className="mapping-row mapping-header" role="row">
          <span>Source column</span>
          <span>Sample</span>
          <span>Suggestion</span>
          <span>Map to</span>
        </div>
        {plan.suggestions.map((suggestion) => {
          const topCandidate = suggestion.candidates[0];
          return (
            <div className="mapping-row" role="row" key={suggestion.sourceColumn}>
              <div className="source-cell">
                <strong>{suggestion.sourceColumn}</strong>
                <span className={`decision decision-${suggestion.decision}`}>
                  {decisionLabel(suggestion.decision)}
                </span>
              </div>
              <div className="sample-cell" title={sampleValue(table, suggestion.sourceColumn)}>
                {sampleValue(table, suggestion.sourceColumn)}
              </div>
              <div className="suggestion-cell">
                <strong>{topCandidate ? FIELD_LABELS[topCandidate.field] : "No suggestion"}</strong>
                <span>{confidenceLabel(topCandidate?.confidence)} confidence</span>
              </div>
              <select
                aria-label={`Map ${suggestion.sourceColumn}`}
                value={mapping[suggestion.sourceColumn] ?? "ignore"}
                onChange={(event) =>
                  onChange(
                    suggestion.sourceColumn,
                    event.target.value as CanonicalField | "ignore",
                  )
                }
              >
                <option value="ignore">Ignore column</option>
                {FIELD_OPTIONS.map((field) => (
                  <option key={field.value} value={field.value}>{field.label}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
