import { useMemo, useState } from "react";
import {
  analyzeImportSource,
  updateImportSourceMapping,
  validateMapping,
  type CanonicalField,
  type ImportSession,
} from "./application/public";
import { createBrowserImportSession } from "./composition/browserImport";
import { DataHealthReview } from "./components/DataHealthReview";
import { FileSummary } from "./components/FileSummary";
import { MappingPanel } from "./components/MappingPanel";
import { UploadPanel } from "./components/UploadPanel";

export default function App() {
  const [session, setSession] = useState<ImportSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const source = session?.sources[0];
  const table = source?.table;
  const result = source?.result;

  const validation = useMemo(
    () => (source ? validateMapping(source.table, source.mapping) : null),
    [source],
  );

  async function processFile(file: File) {
    setBusy(true);
    setError(null);

    try {
      setSession(await createBrowserImportSession(file));
    } catch (caught) {
      setSession(null);
      setError(caught instanceof Error ? caught.message : "The file could not be read.");
    } finally {
      setBusy(false);
    }
  }

  function updateMapping(sourceColumn: string, value: CanonicalField | "ignore") {
    if (!session || !source) return;
    setSession(
      updateImportSourceMapping(session, source.id, {
        ...source.mapping,
        [sourceColumn]: value,
      }),
    );
  }

  function reset() {
    setSession(null);
    setError(null);
  }

  function runAnalysis() {
    if (!session || !source || !validation?.valid) return;

    try {
      setSession(analyzeImportSource(session, source.id));
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
          <div className={`step ${table && !result ? "active" : result ? "complete" : ""}`}><span>2</span>Map fields</div>
          <div className={`step ${result ? "active" : ""}`}><span>3</span>Review & export</div>
        </nav>

        {error && <div className="alert error-alert" role="alert">{error}</div>}

        {!source || !table ? (
          <UploadPanel busy={busy} onFile={(file) => void processFile(file)} />
        ) : (
          <>
            <FileSummary table={table} onReset={reset} />
            <MappingPanel
              table={table}
              plan={source.mappingPlan}
              mapping={source.mapping}
              onChange={updateMapping}
            />

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

            {result && <DataHealthReview result={result} />}
          </>
        )}
      </main>

      <footer>
        DemandLint V0.1.1 · Local-first processing · architecture ready for saved mappings and connectors
      </footer>
    </div>
  );
}
