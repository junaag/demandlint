import { useEffect, useMemo, useState, type SetStateAction } from "react";
import {
  buildTemplateExport, cloneExportTemplate, createExportTemplateDraft, emptyValueHandlingFor,
  exportRuntimeColumns, exportRuntimeValueKey, exportTemplateId,
  type ExportParameterValues, type ExportTemplate, type ExportTemplateColumn, type ProcessedDataset,
} from "../application/public";
import type { DataExportFormat } from "../application/exportFileName";
import { downloadFilledTemplateWorkbook, downloadTemplateExport } from "../composition/browserExport";
import { loadBrowserExportRuntimeValues, saveBrowserExportRuntimeValues } from "../composition/browserExportRuntimeValues";
import {
  createExportPreparationState, restoreRuntimeValues, selectExportPreparationMode,
  selectExportTemplate, type ExportMethod, type ExportPreparationMode,
} from "../application/exportPreparationWorkflow";
import { ExportTemplateEditor } from "./ExportTemplateEditor";

interface ExportPreparationProps { result: ProcessedDataset; templates: ExportTemplate[]; organizationId: string; onSave: (template: ExportTemplate) => Promise<ExportTemplate>; }
type StructureFilter = "all" | "mapped" | "runtime" | "blank";

const FORMAT_OPTIONS: Array<{ value: DataExportFormat; label: string }> = [
  { value: "csv", label: "CSV (comma)" }, { value: "csv-semicolon", label: "CSV (semicolon)" }, { value: "tsv", label: "TSV (tab)" }, { value: "xlsx", label: "Excel (.xlsx)" }, { value: "xls", label: "Excel 97–2003 (.xls)" },
];

function displayExportValue(value: unknown): string { return value instanceof Date ? value.toISOString() : String(value ?? ""); }
function formatName(format: DataExportFormat): string { return format === "xlsx" ? "XLSX" : format === "xls" ? "XLS" : format === "tsv" ? "TSV" : "CSV"; }
function runtimeLabel(column: ExportTemplateColumn): string { return column.source.kind === "parameter" ? column.source.label : column.header || "Unnamed value"; }
function isRequiredRuntimeValue(column: ExportTemplateColumn): boolean { return emptyValueHandlingFor(column).kind === "required"; }
function structureStatus(column: ExportTemplateColumn): { filter: StructureFilter; label: string } {
  if (column.source.kind === "canonical" || column.source.kind === "custom") return { filter: "mapped", label: "Mapped automatically" };
  if (column.source.kind === "empty") return { filter: "blank", label: "Intentionally blank" };
  if (column.source.kind === "fixed" && column.source.value !== undefined) return { filter: "blank", label: "Fixed value" };
  return { filter: "runtime", label: "Value to provide" };
}

export function ExportMethodChoice({ template, method, onChange }: { template: ExportTemplate; method: ExportMethod; onChange: (method: ExportMethod) => void }) {
  if (!template.workbook) return null;
  return <section className="template-selection export-method-choice" aria-labelledby="export-method-title">
    <div className="workflow-section-heading"><span>2. EXPORT METHOD</span><h3 id="export-method-title">Export method</h3></div>
    <div className="export-mode-choice" role="radiogroup" aria-label="Export method">
      <button type="button" className={method === "generate" ? "mode-choice active" : "mode-choice"} role="radio" aria-checked={method === "generate"} onClick={() => onChange("generate")}><strong>Generate new file</strong><span>Use the current export generator and choose an available file format.</span></button>
      <button type="button" className={method === "fill-workbook" ? "mode-choice active" : "mode-choice"} role="radio" aria-checked={method === "fill-workbook"} onClick={() => onChange("fill-workbook")}><strong>Fill template workbook</strong><span>{template.workbook.originalFileName} · {template.workbook.targetSheet}<br />Data will be inserted into the stored workbook while preserving its existing workbook structure.</span></button>
    </div>
  </section>;
}

export function ExportPreparation({ result, templates, organizationId, onSave }: ExportPreparationProps) {
  const [workflow, setWorkflow] = useState(() => createExportPreparationState(createExportTemplateDraft({ name: "Custom export", destinationType: "Custom destination" })));
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [changingTemplate, setChangingTemplate] = useState(false);
  const [structureFilter, setStructureFilter] = useState<StructureFilter>("all");
  const [exportMethod, setExportMethod] = useState<ExportMethod>("generate");
  const [busy, setBusy] = useState<"save" | "download" | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const active = workflow[workflow.mode];
  const { draft, format, parameters } = active;
  const runtimeColumns = useMemo(() => exportRuntimeColumns(draft), [draft]);
  const requiredRuntimeColumns = runtimeColumns.filter(isRequiredRuntimeValue);
  const optionalRuntimeColumns = runtimeColumns.filter((column) => !isRequiredRuntimeValue(column));
  const output = useMemo(() => buildTemplateExport(draft, result.ready, parameters), [draft, result.ready, parameters]);
  const previewRows = output.rows.slice(0, 5);
  const uniqueIssues = [...new Map(output.issues.map((issue) => [issue.message, issue])).values()];
  const blockingIssues = uniqueIssues.filter((issue) => issue.outcome !== "review");
  const templateSelected = workflow.mode === "template" && Boolean(selectedTemplateId);
  const requiredCompleted = requiredRuntimeColumns.filter((column) => Boolean(parameters[exportRuntimeValueKey(column)]?.trim())).length;
  const requiredRemaining = requiredRuntimeColumns.length - requiredCompleted;
  const mappedCount = draft.columns.filter((column) => structureStatus(column).filter === "mapped").length;
  const blankOrFixedCount = draft.columns.filter((column) => structureStatus(column).filter === "blank").length;
  const readyToExport = requiredRemaining === 0 && blockingIssues.length === 0 && result.ready.length > 0;
  const filteredStructure = draft.columns.filter((column) => structureFilter === "all" || structureStatus(column).filter === structureFilter);

  useEffect(() => { if (templateSelected) saveBrowserExportRuntimeValues(draft.id, parameters); }, [draft.id, parameters, templateSelected]);

  function changeMode(mode: ExportPreparationMode) { setWorkflow((current) => selectExportPreparationMode(current, mode)); setExportMethod("generate"); setMessage(null); }
  function setDraft(update: SetStateAction<ExportTemplate>) { setWorkflow((current) => { const currentDraft = current[current.mode].draft; const next = typeof update === "function" ? update(currentDraft) : update; return { ...current, [current.mode]: { ...current[current.mode], draft: next, format: next.defaultFormat } }; }); }
  function setFormat(nextFormat: DataExportFormat) { setWorkflow((current) => ({ ...current, [current.mode]: { ...current[current.mode], format: nextFormat } })); }
  function setParameters(update: SetStateAction<ExportParameterValues>) { setWorkflow((current) => { const next = typeof update === "function" ? update(current[current.mode].parameters) : update; return { ...current, [current.mode]: { ...current[current.mode], parameters: next } }; }); }

  function selectTemplate(id: string) {
    const selected = templates.find((template) => template.id === id);
    if (!selected) return;
    const selectedState = selectExportTemplate(workflow, selected);
    const restored = restoreRuntimeValues(selectedState.template.draft, loadBrowserExportRuntimeValues(selected.id));
    const preserved = selectedState.template.parameters;
    const nextParameters = { ...restored, ...preserved };
    const preservedCount = Object.keys(preserved).filter((key) => preserved[key]?.trim()).length;
    const restoredCount = Object.keys(restored).filter((key) => !(key in preserved) && restored[key]?.trim()).length;
    setSelectedTemplateId(id); setChangingTemplate(false); setExportMethod("generate");
    setWorkflow({ ...selectedState, template: { ...selectedState.template, parameters: nextParameters } });
    setMessage(preservedCount || restoredCount ? { kind: "success", text: `${preservedCount} value${preservedCount === 1 ? "" : "s"} preserved${restoredCount ? ` · ${restoredCount} last-used value${restoredCount === 1 ? "" : "s"} restored` : ""}.` } : null);
  }

  async function saveAsTemplate() { setBusy("save"); setMessage(null); try { await onSave(cloneExportTemplate(draft, { id: exportTemplateId(), organizationId, builtIn: false, defaultFormat: format })); setMessage({ kind: "success", text: "A new workspace template was saved." }); } catch (caught) { setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template could not be saved." }); } finally { setBusy(null); } }
  async function download() {
    if (!readyToExport) { setMessage({ kind: "error", text: blockingIssues[0]?.message ?? (requiredRemaining ? `${requiredRemaining} required value${requiredRemaining === 1 ? " is" : "s are"} still missing.` : "There are no ready rows to export.") }); return; }
    setBusy("download"); setMessage(null);
    try {
      if (exportMethod === "fill-workbook") await downloadFilledTemplateWorkbook(result, draft, parameters);
      else await downloadTemplateExport(result, { ...draft, defaultFormat: format }, parameters, format);
      setMessage({ kind: "success", text: `${result.ready.length} ready rows exported with '${draft.name}'.` });
    } catch (caught) { setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The export could not be created." }); } finally { setBusy(null); }
  }

  function runtimeField(column: ExportTemplateColumn) {
    const allowed = column.validationRules?.find((rule): rule is Extract<typeof rule, { kind: "allowedValues" }> => rule.kind === "allowedValues");
    const dependent = column.validationRules?.find((rule): rule is Extract<typeof rule, { kind: "dependentAllowedValues" }> => rule.kind === "dependentAllowedValues");
    const parent = dependent ? draft.columns.find((candidate) => candidate.id === dependent.parentColumnId) : undefined;
    const parentValue = parent && (parent.source.kind === "fixed" || parent.source.kind === "parameter") ? parameters[exportRuntimeValueKey(parent)] ?? (parent.source.kind === "fixed" ? parent.source.value : parent.source.defaultValue) ?? "" : "";
    const allowedValues = allowed?.values ?? (dependent ? dependent.cases[parentValue] : undefined);
    const key = exportRuntimeValueKey(column); const required = isRequiredRuntimeValue(column); const listId = `allowed-values-${column.id}`;
    const inputType = column.format === "date" ? "date" : column.format === "datetime" ? "datetime-local" : allowedValues ? "search" : "text";
    return <label className="runtime-value-field" key={column.id}><span>{runtimeLabel(column)}{required && <><b aria-hidden="true"> *</b><em>Required</em></>}</span><input type={inputType} list={allowedValues ? listId : undefined} value={parameters[key] ?? ""} onChange={(event) => setParameters((current) => ({ ...current, [key]: event.target.value }))} placeholder={allowedValues ? "Search or select…" : undefined} />{allowedValues && <datalist id={listId}>{allowedValues.map((value) => <option key={value} value={value} />)}</datalist>}</label>;
  }

  return <section className="panel export-preparation" aria-labelledby="prepare-export-title">
    <div className="section-heading"><div><p className="section-label">PREPARE EXPORT</p><h2 id="prepare-export-title">Match the exact file your destination expects</h2><p>Choose how to prepare this export. Lead data stays in this browser.</p></div></div>
    <div className="export-mode-choice" role="group" aria-label="Export preparation mode"><button className={workflow.mode === "custom" ? "mode-choice active" : "mode-choice"} type="button" onClick={() => changeMode("custom")} aria-pressed={workflow.mode === "custom"}><strong>Custom export</strong><span>Choose the format and configure the exact columns to export.</span></button><button className={workflow.mode === "template" ? "mode-choice active" : "mode-choice"} type="button" onClick={() => changeMode("template")} aria-pressed={workflow.mode === "template"}><strong>Use a template</strong><span>Apply a saved workspace template without changing it.</span></button></div>
    {message && <div className={`inline-notice ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}><span>{message.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button></div>}

    {workflow.mode === "template" && <section className="template-selection" aria-labelledby="template-selection-title"><div className="workflow-section-heading"><span>1. TEMPLATE</span><h3 id="template-selection-title">{templateSelected ? "Selected template" : "Choose a template"}</h3></div>{templates.length === 0 ? <div className="empty-state"><strong>No workspace templates yet.</strong><span>Create one from Custom export, then select it here.</span></div> : !templateSelected || changingTemplate ? <label className="template-picker"><span>Workspace template</span><select autoFocus={changingTemplate} value={selectedTemplateId} onChange={(event) => selectTemplate(event.target.value)}><option value="">Select a template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label> : <><div className="selected-template-card"><div><strong title={draft.name}>{draft.name}</strong><p>{draft.columns.length} columns · {formatName(format)}<br />{mappedCount} mapped automatically · {runtimeColumns.length} values to provide{blankOrFixedCount ? ` · ${blankOrFixedCount} blank/fixed` : ""}</p></div><div className="selected-template-actions"><button className="button secondary" type="button" onClick={() => setChangingTemplate(true)}>Change template</button></div></div><details className="template-structure"><summary>View template structure · {draft.columns.length} columns</summary><div className="structure-filters" role="group" aria-label="Template structure filter">{(["all", "mapped", "runtime", "blank"] as const).map((filter) => <button key={filter} type="button" className={structureFilter === filter ? "active" : ""} onClick={() => setStructureFilter(filter)}>{filter === "all" ? "All" : filter === "mapped" ? "Mapped" : filter === "runtime" ? "Values to provide" : "Empty / fixed"}</button>)}</div><div className="template-structure-table-wrap"><table><thead><tr><th>#</th><th>Output field</th><th>Value source</th><th>Status</th></tr></thead><tbody>{filteredStructure.map((column) => { const status = structureStatus(column); return <tr key={column.id}><td>{draft.columns.indexOf(column) + 1}</td><td>{column.header || "(blank header)"}</td><td>{column.source.kind === "canonical" ? "Imported field" : column.source.kind === "custom" ? "Imported custom field" : column.source.kind === "empty" ? "Empty" : column.source.kind === "fixed" && column.source.value !== undefined ? "Fixed template value" : "Runtime export value"}</td><td><span className={`structure-status ${status.filter}`}>{status.label}</span></td></tr>; })}</tbody></table></div></details></>}</section>}
    {workflow.mode === "custom" && <ExportTemplateEditor template={draft} onChange={setDraft} heading="Included output columns" />}

    {templateSelected && <ExportMethodChoice template={draft} method={exportMethod} onChange={setExportMethod} />}

    {(templateSelected || workflow.mode === "custom") && <>{runtimeColumns.length > 0 && <section className="export-parameters" aria-labelledby="export-values-title"><div className="values-heading"><div><div className="workflow-section-heading"><span>{templateSelected ? "3. VALUES FOR THIS EXPORT" : "VALUES FOR THIS EXPORT"}</span><h3 id="export-values-title">Values for this export</h3></div><p>These values are applied to every applicable exported row and are not saved in the template.</p></div><span className={readyToExport ? "readiness ready" : "readiness"}>{readyToExport ? "Ready to export" : `${requiredCompleted} / ${requiredRuntimeColumns.length} required values completed`}</span></div>{requiredRuntimeColumns.length > 0 && <div className="runtime-value-group"><h4>Required values <span>· {requiredRuntimeColumns.length}</span></h4><div className="parameter-grid">{requiredRuntimeColumns.map(runtimeField)}</div></div>}{optionalRuntimeColumns.length > 0 && <div className="runtime-value-group optional"><h4>Optional values <span>· {optionalRuntimeColumns.length}</span></h4><div className="parameter-grid">{optionalRuntimeColumns.map(runtimeField)}</div></div>}</section>}
      <section className="export-preview-block" aria-labelledby="export-readiness-title"><div className="export-preview-heading"><div><div className="workflow-section-heading"><span>{templateSelected ? "4. EXPORT PREVIEW / READINESS" : "EXPORT PREVIEW / READINESS"}</span><h3 id="export-readiness-title">{readyToExport ? "Ready to export" : requiredRemaining ? `${requiredRemaining} required value${requiredRemaining === 1 ? " remaining" : "s remaining"}` : "Export needs review"}</h3></div><p>First {Math.min(5, result.ready.length)} of {result.ready.length} ready rows.</p></div>{uniqueIssues.length > 0 && <span className="validation-count">{uniqueIssues.length} validation issue{uniqueIssues.length === 1 ? "" : "s"}</span>}</div>{uniqueIssues.length > 0 && <ul className="export-validation-list">{uniqueIssues.slice(0, 5).map((issue) => <li key={`${issue.columnId}-${issue.message}`}>{issue.message}</li>)}</ul>}<div className="export-preview-table-wrap"><table className="export-preview-table"><thead><tr>{output.columns.map((column) => <th key={column.key}>{column.header || "(blank header)"}</th>)}</tr></thead><tbody>{previewRows.map((row, rowIndex) => <tr key={rowIndex}>{output.columns.map((column) => <td key={column.key}>{displayExportValue(row[column.key])}</td>)}</tr>)}</tbody></table></div></section>
      <div className="prepare-export-actions">
        <div className="template-management-actions">{workflow.mode === "custom" && <button className="button secondary" type="button" disabled={busy !== null || !draft.name.trim()} onClick={() => void saveAsTemplate()}>{busy === "save" ? "Saving…" : "Save as template"}</button>}</div>
        <div className="download-ready-actions">
          <span className={readyToExport ? "action-readiness ready" : "action-readiness"}>{readyToExport ? "Ready to export" : requiredRemaining ? `${requiredRemaining} required value${requiredRemaining === 1 ? " remaining" : "s remaining"}` : `${blockingIssues.length} export issue${blockingIssues.length === 1 ? "" : "s"}`}</span>
          {exportMethod === "generate" && <label><span>File format</span><select value={format} onChange={(event) => setFormat(event.target.value as DataExportFormat)}>{FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
          <button className="button primary" type="button" disabled={busy !== null || !readyToExport} onClick={() => void download()}>{busy === "download" ? "Creating…" : exportMethod === "fill-workbook" ? "Fill template workbook" : `Export ${formatName(format)}`}</button>
        </div>
      </div>
    </>}
  </section>;
}
