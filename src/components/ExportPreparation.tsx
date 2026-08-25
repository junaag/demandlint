import { useMemo, useState, type SetStateAction } from "react";
import {
  buildTemplateExport,
  cloneExportTemplate,
  createExportTemplateDraft,
  exportRuntimeColumns,
  exportTemplateId,
  type ExportParameterValues,
  type ExportTemplate,
  type ProcessedDataset,
} from "../application/public";
import type { DataExportFormat } from "../application/exportFileName";
import { downloadTemplateExport } from "../composition/browserExport";
import { createExportPreparationState, selectExportPreparationMode, selectExportTemplate, type ExportPreparationMode } from "../application/exportPreparationWorkflow";
import { ExportTemplateEditor } from "./ExportTemplateEditor";

interface ExportPreparationProps {
  result: ProcessedDataset;
  templates: ExportTemplate[];
  organizationId: string;
  onSave: (template: ExportTemplate) => Promise<ExportTemplate>;
}

const FORMAT_OPTIONS: Array<{ value: DataExportFormat; label: string }> = [
  { value: "csv", label: "CSV (comma)" }, { value: "csv-semicolon", label: "CSV (semicolon)" },
  { value: "tsv", label: "TSV (tab)" }, { value: "xlsx", label: "Excel (.xlsx)" }, { value: "xls", label: "Excel 97–2003 (.xls)" },
];

function displayExportValue(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

export function ExportPreparation({ result, templates, organizationId, onSave }: ExportPreparationProps) {
  const [workflow, setWorkflow] = useState(() => createExportPreparationState(createExportTemplateDraft({ name: "Custom export", destinationType: "Custom destination" })));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [busy, setBusy] = useState<"save" | "download" | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const active = workflow[workflow.mode];
  const { draft, format, parameters } = active;
  const runtimeColumns = useMemo(() => exportRuntimeColumns(draft), [draft]);
  const output = useMemo(() => buildTemplateExport(draft, result.ready, parameters), [draft, result.ready, parameters]);
  const previewRows = output.rows.slice(0, 5);
  const uniqueIssues = [...new Map(output.issues.map((issue) => [issue.message, issue])).values()];
  const templateSelected = workflow.mode === "template" && Boolean(selectedTemplateId);

  function changeMode(mode: ExportPreparationMode) {
    setWorkflow((current) => selectExportPreparationMode(current, mode));
    setMessage(null);
  }

  function setDraft(update: SetStateAction<ExportTemplate>) {
    setWorkflow((current) => {
      const currentDraft = current[current.mode].draft;
      const next = typeof update === "function" ? update(currentDraft) : update;
      return { ...current, [current.mode]: { ...current[current.mode], draft: next, format: next.defaultFormat } };
    });
  }

  function setFormat(nextFormat: DataExportFormat) {
    setWorkflow((current) => ({ ...current, [current.mode]: { ...current[current.mode], format: nextFormat } }));
  }

  function setParameters(update: SetStateAction<ExportParameterValues>) {
    setWorkflow((current) => {
      const next = typeof update === "function" ? update(current[current.mode].parameters) : update;
      return { ...current, [current.mode]: { ...current[current.mode], parameters: next } };
    });
  }

  function selectTemplate(id: string) {
    const selected = templates.find((template) => template.id === id);
    if (!selected) return;
    setSelectedTemplateId(id);
    setWorkflow((current) => selectExportTemplate(current, selected));
    setMessage(null);
  }

  async function saveAsTemplate() {
    setBusy("save"); setMessage(null);
    try {
      await onSave(cloneExportTemplate(draft, { id: exportTemplateId(), organizationId, builtIn: false, defaultFormat: format }));
      setMessage({ kind: "success", text: "A new workspace template was saved." });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template could not be saved." });
    } finally { setBusy(null); }
  }

  async function download() {
    setBusy("download"); setMessage(null);
    try {
      await downloadTemplateExport(result, { ...draft, defaultFormat: format }, parameters, format);
      setMessage({ kind: "success", text: `${result.ready.length} ready rows exported with '${draft.name}'.` });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The export could not be created." });
    } finally { setBusy(null); }
  }

  return <section className="panel export-preparation" aria-labelledby="prepare-export-title">
    <div className="section-heading"><div><p className="section-label">PREPARE EXPORT</p><h2 id="prepare-export-title">Match the exact file your destination expects</h2><p>Choose how to prepare this export. Lead data stays in this browser.</p></div></div>
    <div className="export-mode-choice" role="group" aria-label="Export preparation mode">
      <button className={workflow.mode === "custom" ? "mode-choice active" : "mode-choice"} type="button" onClick={() => changeMode("custom")} aria-pressed={workflow.mode === "custom"}><strong>Custom export</strong><span>Choose the format and configure the exact columns to export.</span></button>
      <button className={workflow.mode === "template" ? "mode-choice active" : "mode-choice"} type="button" onClick={() => changeMode("template")} aria-pressed={workflow.mode === "template"}><strong>Use a template</strong><span>Apply a saved workspace template without changing it.</span></button>
    </div>
    {message && <div className={`inline-notice ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}><span>{message.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button></div>}

    {workflow.mode === "template" && <div className="template-source-actions">
      {templates.length === 0 ? <div className="empty-state"><strong>No workspace templates yet.</strong><span>Create one from Custom export, then select it here.</span></div> : <label><span>Workspace template</span><select value={selectedTemplateId} onChange={(event) => selectTemplate(event.target.value)}><option value="">Select a template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>}
      {templateSelected && <div className="template-configuration"><div><h3>Template structure</h3><p>{draft.destinationType || "No destination label"}{draft.sheetName ? ` · Worksheet: ${draft.sheetName}` : ""}</p></div><ol>{draft.columns.map((column) => <li key={column.id}><strong>{column.header || "(blank header)"}</strong><span>{column.source.kind === "parameter" || column.source.kind === "fixed" ? "Fixed field" : column.source.kind === "empty" ? "Leave empty" : "Mapped field"}</span></li>)}</ol></div>}
    </div>}

    {workflow.mode === "custom" && <ExportTemplateEditor template={draft} onChange={setDraft} heading="Included output columns" />}

    {(templateSelected || workflow.mode === "custom") && <>
      {runtimeColumns.length > 0 && <div className="export-parameters"><div><h3>Values for this export</h3><p>These values apply to every exported row and are not saved in the template.</p></div><div className="parameter-grid">{runtimeColumns.map((column) => {
        const allowed = column.validationRules?.find((rule): rule is Extract<typeof rule, { kind: "allowedValues" }> => rule.kind === "allowedValues");
        const dependent = column.validationRules?.find((rule): rule is Extract<typeof rule, { kind: "dependentAllowedValues" }> => rule.kind === "dependentAllowedValues");
        const parent = dependent ? draft.columns.find((candidate) => candidate.id === dependent.parentColumnId) : undefined;
        const dependentValues = dependent && parent?.source.kind === "fixed" ? dependent.cases[parameters[parent.id] ?? ""] : undefined;
        const allowedValues = allowed?.values ?? dependentValues;
        const key = column.source.kind === "parameter" ? column.source.key : column.id;
        const label = column.source.kind === "parameter" ? column.source.label : column.header;
        const required = column.emptyValueHandling?.kind === "required" || column.required;
        return <label key={column.id}><span>{label}{required ? " *" : ""}</span>{allowedValues ? <select value={parameters[key] ?? ""} onChange={(event) => setParameters((current) => ({ ...current, [key]: event.target.value }))}><option value="">Select a value</option>{allowedValues.map((value) => <option key={value} value={value}>{value}</option>)}</select> : <input value={parameters[key] ?? ""} onChange={(event) => setParameters((current) => ({ ...current, [key]: event.target.value }))} />}</label>;
      })}</div></div>}
      <div className="export-preview-block"><div className="export-preview-heading"><div><h3>Exact output preview</h3><p>First {Math.min(5, result.ready.length)} of {result.ready.length} ready rows.</p></div>{uniqueIssues.length > 0 && <span className="validation-count">{output.issues.length} validation issue{output.issues.length === 1 ? "" : "s"}</span>}</div>{uniqueIssues.length > 0 && <ul className="export-validation-list">{uniqueIssues.slice(0, 5).map((issue) => <li key={`${issue.columnId}-${issue.message}`}>{issue.message}</li>)}</ul>}<div className="export-preview-table-wrap"><table className="export-preview-table"><thead><tr>{output.columns.map((column) => <th key={column.key}>{column.header || "(blank header)"}</th>)}</tr></thead><tbody>{previewRows.map((row, rowIndex) => <tr key={rowIndex}>{output.columns.map((column) => <td key={column.key}>{displayExportValue(row[column.key])}</td>)}</tr>)}</tbody></table></div></div>
      <div className="prepare-export-actions"><div className="template-management-actions">{workflow.mode === "custom" && <button className="button secondary" type="button" disabled={busy !== null || !draft.name.trim()} onClick={() => void saveAsTemplate()}>{busy === "save" ? "Saving…" : "Save as template"}</button>}</div><div className="download-ready-actions"><label><span>File format</span><select value={format} onChange={(event) => setFormat(event.target.value as DataExportFormat)}>{FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className="button primary" type="button" disabled={busy !== null || output.issues.some((issue) => issue.outcome !== "review") || result.ready.length === 0} onClick={() => void download()}>{busy === "download" ? "Creating…" : `Export ${result.ready.length} ready rows`}</button></div></div>
    </>}
  </section>;
}
