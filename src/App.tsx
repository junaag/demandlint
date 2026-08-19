import { useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { analyzeParsedTable, validateMapping } from "./application/analyzeParsedTable";
import { readBrowserFile } from "./adapters/browser/readBrowserFile";
import { parseTableFile } from "./adapters/table/parseTableFile";
import type { ParsedTable } from "./adapters/table/domain";
import type { CanonicalField, ColumnMapping, ProcessedDataset } from "./core/domain";
import type { MappingPlan, MappingConfidence, MappingDecision } from "./core/mapping/domain";
import { suggestColumnMapping } from "./core/mapping/suggestColumnMapping";

const FIELD_OPTIONS: { value: CanonicalField; label: string }[] = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "company", label: "Company" },
  { value: "jobTitle", label: "Job Title" },
  { value: "phone", label: "Phone" },
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

function initialMapping(plan: MappingPlan): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const suggestion of plan.suggestions) {
    mapping[suggestion.sourceColumn] =
      suggestion.decision === "auto" && suggestion.selectedField
        ? suggestion.selectedField
        : "ignore";
  }
  return mapping;
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

export default function App() {
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [plan, setPlan] = useState<MappingPlan | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [result, setResult] = useState<ProcessedDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const validation = useMemo(
    () => (table ? validateMapping(table, mapping) : null),
    [table, mapping],
  );

  async function processFile(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const localFile = await readBrowserFile(file);
      const parsedTable = await parseTableFile(localFile);
      const mappingPlan = suggestColumnMapping(parsedTable.columns);

      setTable(parsedTable);
      setPlan(mappingPlan);
      setMapping(initialMapping(mappingPlan));
    } catch (caught) {
      setTable(null);
      setPlan(null);
      setMapping({});
      setError(caught instanceof Error ? caught.message : "The file could not be read.");
    } finally {
      setBusy(false);
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) void processFile(file);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function updateMapping(sourceColumn: string, value: CanonicalField | "ignore") {
    setMapping((current) => ({ ...current, [sourceColumn]: value }));
    setResult(null);
  }

  function reset() {
    setTable(null);
    setPlan(null);
    setMapping({});
    setResult(null);
    setError(null);
  }

  function runAnalysis() {
    if (!table || !validation?.valid) return;
    try {
      setResult(analyzeParsedTable(table, mapping));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">D</div>
          <div>
            <strong>DemandLint</strong>
            <span>Lead import quality</span>
          </div>
        </div>
        <div className="privacy-pill">Processed locally · no upload</div>
      </header>

      <main className="page">
        <section className="hero">
          <p className="eyebrow">CRM IMPORT PRE-FLIGHT</p>
          <h1>Catch bad lead data before it reaches your CRM.</h1>
          <p>
            Upload a CSV or XLSX file, confirm the field mapping, then run DemandLint’s
            deterministic quality checks directly in your browser.
          </p>
        </section>

        <nav className="steps" aria-label="Import workflow">
          <div className={`step ${table ? "complete" : "active"}`}><span>1</span>Upload</div>
          <div className={`step ${table ? "active" : ""}`}><span>2</span>Map fields</div>
          <div className={`step ${result ? "active" : ""}`}><span>3</span>Analyze</div>
        </nav>

        {error && <div className="alert error-alert" role="alert">{error}</div>}

        {!table ? (
          <section className="panel upload-panel">
            <div
              className={`dropzone ${dragActive ? "drag-active" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <div className="upload-icon" aria-hidden="true">↑</div>
              <h2>{busy ? "Reading your file…" : "Drop your lead file here"}</h2>
              <p>CSV or XLSX · processed entirely in this browser session</p>
              <label className="button primary" htmlFor="lead-file-input">
                {busy ? "Processing…" : "Choose file"}
              </label>
              <input
                id="lead-file-input"
                className="visually-hidden"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileInput}
                disabled={busy}
              />
            </div>
          </section>
        ) : (
          <>
            <section className="panel file-summary">
              <div>
                <p className="section-label">SOURCE FILE</p>
                <h2>{table.metadata.fileName}</h2>
              </div>
              <div className="metadata-grid">
                <div><strong>{table.metadata.rowCount}</strong><span>Rows</span></div>
                <div><strong>{table.metadata.columnCount}</strong><span>Columns</span></div>
                <div><strong>{table.metadata.sourceType.toUpperCase()}</strong><span>Format</span></div>
                <div>
                  <strong>{table.metadata.sheetName ?? table.metadata.delimiter ?? "—"}</strong>
                  <span>{table.metadata.sheetName ? "Sheet" : "Delimiter"}</span>
                </div>
              </div>
              <button className="button ghost" type="button" onClick={reset}>Use another file</button>
            </section>

            <section className="panel mapping-panel">
              <div className="section-heading">
                <div>
                  <p className="section-label">FIELD MAPPING</p>
                  <h2>Confirm how your columns should be interpreted</h2>
                  <p>Only unique high-confidence matches are selected automatically.</p>
                </div>
                {plan && (
                  <div className="mapping-counts" aria-label="Mapping summary">
                    <span><b>{plan.autoMappedCount}</b> auto</span>
                    <span><b>{plan.reviewCount}</b> review</span>
                    <span><b>{plan.ambiguousCount}</b> ambiguous</span>
                  </div>
                )}
              </div>

              <div className="mapping-table" role="table" aria-label="Column mappings">
                <div className="mapping-row mapping-header" role="row">
                  <span>Source column</span>
                  <span>Sample</span>
                  <span>Suggestion</span>
                  <span>Map to</span>
                </div>
                {plan?.suggestions.map((suggestion) => {
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
                          updateMapping(
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

            <section className={`validation-bar ${validation?.valid ? "valid" : "invalid"}`}>
              <div>
                <strong>{validation?.valid ? "Mapping ready" : "Mapping needs attention"}</strong>
                {validation?.valid ? (
                  <span>Required fields are present and each target is mapped once.</span>
                ) : (
                  <span>{validation?.errors.join(" ")}</span>
                )}
              </div>
              <button
                className="button primary"
                type="button"
                disabled={!validation?.valid}
                onClick={runAnalysis}
              >
                Analyze data
              </button>
            </section>

            {result && (
              <section className="panel result-panel" aria-live="polite">
                <div>
                  <p className="section-label">ANALYSIS COMPLETE</p>
                  <h2>Your file has passed through the DemandLint core.</h2>
                  <p>Detailed issue review and export arrive in V0.0.5.</p>
                </div>
                <div className="result-grid">
                  <div><strong>{result.stats.totalRows}</strong><span>Rows checked</span></div>
                  <div><strong>{result.stats.readyRows}</strong><span>Ready</span></div>
                  <div><strong>{result.stats.reviewRows}</strong><span>Review</span></div>
                  <div><strong>{result.stats.blockedRows}</strong><span>Blocked</span></div>
                  <div><strong>{result.stats.duplicateRows}</strong><span>Duplicates</span></div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer>
        DemandLint V0.0.4 · Local-first by design · EN / FR / ES / PT column recognition
      </footer>
    </div>
  );
}
