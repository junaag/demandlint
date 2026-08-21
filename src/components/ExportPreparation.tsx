import { useMemo, useState, type ChangeEvent, type SetStateAction } from "react";
import {
  BUILT_IN_EXPORT_TEMPLATES,
  CANONICAL_FIELD_OPTIONS,
  buildTemplateExport,
  cloneExportTemplate,
  exportParameterColumns,
  templateColumnId,
  type CanonicalField,
  type ExportColumnSource,
  type ExportDatePattern,
  type ExportParameterValues,
  type ExportTemplate,
  type ExportTemplateColumn,
  type ExportValueFormat,
  type ProcessedDataset,
} from "../application/public";
import type { DataExportFormat } from "../application/exportFileName";
import { downloadTemplateExport } from "../composition/browserExport";
import { createExportTemplateFromSample } from "../composition/browserExportTemplates";
import {
  createExportPreparationState,
  selectExportPreparationMode,
  type ExportPreparationMode,
} from "../application/exportPreparationWorkflow";

interface ExportPreparationProps {
  result: ProcessedDataset;
  templates: ExportTemplate[];
  organizationId: string;
  onSave: (template: ExportTemplate) => Promise<ExportTemplate>;
  onDelete: (id: string) => Promise<void>;
}

const FORMAT_OPTIONS: Array<{ value: DataExportFormat; label: string }> = [
  { value: "csv", label: "CSV (comma)" },
  { value: "csv-semicolon", label: "CSV (semicolon)" },
  { value: "tsv", label: "TSV (tab)" },
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "xls", label: "Excel 97–2003 (.xls)" },
];

function copyTemplate(template: ExportTemplate): ExportTemplate {
  return cloneExportTemplate(template, {
    id: template.id,
    ...(template.builtIn !== undefined ? { builtIn: template.builtIn } : {}),
  });
}

function displayExportValue(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

function parameterKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "export_value";
}

function parseMappings(value: string): Array<{ from: string; to: string }> | undefined {
  const mappings = value.split(";").map((pair) => {
    const separator = pair.indexOf("=");
    return separator < 0 ? null : {
      from: pair.slice(0, separator).trim(),
      to: pair.slice(separator + 1).trim(),
    };
  }).filter((item): item is { from: string; to: string } => Boolean(item?.from));
  return mappings.length > 0 ? mappings : undefined;
}

function mappingText(column: ExportTemplateColumn): string {
  return column.valueMappings?.map((item) => `${item.from}=${item.to}`).join("; ") ?? "";
}

function sourceLabel(column: ExportTemplateColumn): string {
  const source = column.source;
  if (source.kind === "canonical") return CANONICAL_FIELD_OPTIONS.find((item) => item.value === source.field)?.label ?? source.field;
  if (source.kind === "custom") return `Custom field: ${source.key || "not set"}`;
  if (source.kind === "constant") return `Fixed value: ${source.value || "empty"}`;
  if (source.kind === "parameter") return `Asked at export: ${source.label}`;
  return "Always empty";
}

export function ExportPreparation({
  result,
  templates,
  organizationId,
  onSave,
  onDelete,
}: ExportPreparationProps) {
  const allTemplates = useMemo(() => [...BUILT_IN_EXPORT_TEMPLATES, ...templates], [templates]);
  const [workflow, setWorkflow] = useState(() => createExportPreparationState(BUILT_IN_EXPORT_TEMPLATES[0]!));
  const [busy, setBusy] = useState<"save" | "delete" | "sample" | "download" | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const active = workflow[workflow.mode];
  const { draft, format, parameters } = active;
  const parameterColumns = useMemo(() => exportParameterColumns(draft), [draft]);
  const output = useMemo(
    () => buildTemplateExport(draft, result.ready, parameters),
    [draft, result.ready, parameters],
  );
  const previewRows = output.rows.slice(0, 5);
  const uniqueIssues = [...new Map(output.issues.map((issue) => [issue.message, issue])).values()];

  function changeMode(mode: ExportPreparationMode) {
    setWorkflow((current) => selectExportPreparationMode(current, mode));
    setMessage(null);
  }

  function setDraft(update: SetStateAction<ExportTemplate>) {
    setWorkflow((current) => {
      const activeDraft = current[current.mode].draft;
      const nextDraft = typeof update === "function" ? update(activeDraft) : update;
      return { ...current, [current.mode]: { ...current[current.mode], draft: nextDraft } };
    });
  }

  function setFormat(format: DataExportFormat) {
    setWorkflow((current) => ({ ...current, [current.mode]: { ...current[current.mode], format } }));
  }

  function setParameters(update: SetStateAction<ExportParameterValues>) {
    setWorkflow((current) => {
      const activeParameters = current[current.mode].parameters;
      const nextParameters = typeof update === "function" ? update(activeParameters) : update;
      return { ...current, [current.mode]: { ...current[current.mode], parameters: nextParameters } };
    });
  }

  function selectTemplate(id: string) {
    const selected = allTemplates.find((template) => template.id === id);
    if (!selected) return;
    const next = copyTemplate(selected);
    setWorkflow((current) => ({
      ...current,
      template: { draft: next, format: next.defaultFormat, parameters: {} },
    }));
    setMessage(null);
  }

  function updateColumn(id: string, update: (column: ExportTemplateColumn) => ExportTemplateColumn) {
    setDraft((current) => ({
      ...current,
      columns: current.columns.map((column) => column.id === id ? update(column) : column),
    }));
  }

  function changeSource(column: ExportTemplateColumn, kind: ExportColumnSource["kind"]) {
    const source: ExportColumnSource = kind === "canonical"
      ? { kind, field: "email" }
      : kind === "custom"
        ? { kind, key: "" }
        : kind === "constant"
          ? { kind, value: "" }
          : kind === "parameter"
            ? { kind, key: parameterKey(column.header), label: column.header || "Export value" }
            : { kind: "empty" };
    updateColumn(column.id, (current) => ({ ...current, source }));
  }

  function moveColumn(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.columns.length) return current;
      const columns = [...current.columns];
      [columns[index], columns[target]] = [columns[target]!, columns[index]!];
      return { ...current, columns };
    });
  }

  async function saveTemplate() {
    setBusy("save");
    setMessage(null);
    try {
      const saved = await onSave({ ...draft, organizationId, defaultFormat: format });
      setWorkflow((current) => ({
        ...current,
        custom: { ...current.custom, draft: copyTemplate(saved) },
      }));
      setMessage({ kind: "success", text: "Export template saved for this workspace." });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template could not be saved." });
    } finally {
      setBusy(null);
    }
  }

  async function deleteTemplate() {
    const selected = workflow.template.draft;
    if (selected.builtIn || !window.confirm(`Delete '${selected.name}'?`)) return;
    setBusy("delete");
    try {
      await onDelete(selected.id);
      selectTemplate(BUILT_IN_EXPORT_TEMPLATES[0]!.id);
      setMessage({ kind: "success", text: "Export template deleted." });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template could not be deleted." });
    } finally {
      setBusy(null);
    }
  }

  async function importSample(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setBusy("sample");
    setMessage(null);
    try {
      const imported = await createExportTemplateFromSample(file);
      setWorkflow((current) => ({
        ...current,
        mode: "custom",
        custom: { draft: imported, format: imported.defaultFormat, parameters: {} },
      }));
      setMessage({ kind: "success", text: `Template created from ${file.name}. Review the suggested sources before saving.` });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The sample file could not be read." });
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("download");
    setMessage(null);
    try {
      await downloadTemplateExport(result, { ...draft, defaultFormat: format }, parameters, format);
      setMessage({ kind: "success", text: `${result.ready.length} ready rows exported with '${draft.name}'.` });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The export could not be created." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel export-preparation" aria-labelledby="prepare-export-title">
      <div className="section-heading">
        <div>
          <p className="section-label">PREPARE EXPORT</p>
          <h2 id="prepare-export-title">Match the exact file your destination expects</h2>
          <p>Choose how to prepare this export. Lead data stays in this browser.</p>
        </div>
      </div>

      <div className="export-mode-choice" role="group" aria-label="Export preparation mode">
        <button className={workflow.mode === "custom" ? "mode-choice active" : "mode-choice"} type="button" onClick={() => changeMode("custom")} aria-pressed={workflow.mode === "custom"}>
          <strong>Custom export</strong><span>Choose the format and configure the exact columns to export.</span>
        </button>
        <button className={workflow.mode === "template" ? "mode-choice active" : "mode-choice"} type="button" onClick={() => changeMode("template")} aria-pressed={workflow.mode === "template"}>
          <strong>Use a template</strong><span>Start from a saved or built-in destination configuration.</span>
        </button>
      </div>

      {message && (
        <div className={`inline-notice ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>
          <span>{message.text}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {workflow.mode === "template" && <div className="template-source-actions">
        <label>
          <span>Destination template</span>
          <select value={draft.id} onChange={(event) => selectTemplate(event.target.value)}>
            <optgroup label="Built-in presets">
              {BUILT_IN_EXPORT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </optgroup>
            {templates.length > 0 && <optgroup label="Workspace templates">
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </optgroup>}
          </select>
        </label>
      </div>}

      {workflow.mode === "custom" && <>
      <div className="export-template-meta">
        <label><span>Export name</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label><span>Destination</span><input value={draft.destinationType} onChange={(event) => setDraft({ ...draft, destinationType: event.target.value })} /></label>
        <label><span>Worksheet name</span><input maxLength={31} value={draft.sheetName ?? ""} onChange={(event) => setDraft({ ...draft, sheetName: event.target.value })} /></label>
      </div>

      <div className="export-column-builder">
        <div className="export-column-builder-heading">
          <div><h3>Included output columns</h3><p>Order is exact. Remove columns to exclude them; empty sources keep the column and leave every cell blank.</p></div>
          <button className="button ghost" type="button" onClick={() => setDraft((current) => ({
            ...current,
            columns: [...current.columns, {
              id: templateColumnId(),
              header: "New column",
              source: { kind: "empty" },
              format: "text",
            }],
          }))}>Add column</button>
        </div>
        {draft.columns.map((column, index) => (
          <article className="export-column-card" key={column.id}>
            <div className="column-order">
              <strong>{index + 1}</strong>
              <button type="button" aria-label="Move column up" disabled={index === 0} onClick={() => moveColumn(index, -1)}>↑</button>
              <button type="button" aria-label="Move column down" disabled={index === draft.columns.length - 1} onClick={() => moveColumn(index, 1)}>↓</button>
            </div>
            <div className="export-column-fields">
              <label><span>Header</span><input value={column.header} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, header: event.target.value }))} /></label>
              <label><span>Value source</span><select value={column.source.kind} onChange={(event) => changeSource(column, event.target.value as ExportColumnSource["kind"])}>
                <option value="canonical">DemandLint field</option>
                <option value="custom">Custom field</option>
                <option value="constant">Fixed value</option>
                <option value="parameter">Ask at export</option>
                <option value="empty">Always empty</option>
              </select></label>
              {column.source.kind === "canonical" && <label><span>DemandLint field</span><select value={column.source.field} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { kind: "canonical", field: event.target.value as CanonicalField } }))}>
                {CANONICAL_FIELD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select></label>}
              {column.source.kind === "custom" && <label><span>Custom field key</span><input value={column.source.key} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { kind: "custom", key: event.target.value } }))} /></label>}
              {column.source.kind === "constant" && <label><span>Fixed value</span><input value={column.source.value} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { kind: "constant", value: event.target.value } }))} /></label>}
              {column.source.kind === "parameter" && <>
                <label><span>Prompt label</span><input value={column.source.label} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { ...column.source, label: event.target.value, key: parameterKey(event.target.value) } }))} /></label>
                <label><span>Prompt default</span><input value={column.source.defaultValue ?? ""} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { ...column.source, defaultValue: event.target.value } }))} /></label>
              </>}
              <label><span>Fallback if empty</span><input value={column.defaultValue ?? ""} onChange={(event) => updateColumn(column.id, (current) => {
                const { defaultValue: _defaultValue, ...withoutDefault } = current;
                return event.target.value ? { ...withoutDefault, defaultValue: event.target.value } : withoutDefault;
              })} /></label>
              <label><span>Format</span><select value={column.format ?? "text"} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, format: event.target.value as ExportValueFormat }))}>
                <option value="text">Text / identifier</option><option value="date">Date (ISO)</option><option value="datetime">Date & time (ISO)</option><option value="number">Number</option><option value="boolean">Boolean</option>
              </select></label>
              {(column.format === "date" || column.format === "datetime") && <label><span>Date pattern</span><select value={column.datePattern ?? (column.format === "datetime" ? "iso-datetime" : "yyyy-MM-dd")} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, datePattern: event.target.value as ExportDatePattern }))}>
                <option value="yyyy-MM-dd">YYYY-MM-DD</option><option value="yyyy/MM/dd">YYYY/MM/DD</option><option value="MM/dd/yyyy">MM/DD/YYYY</option><option value="dd/MM/yyyy">DD/MM/YYYY</option><option value="iso-datetime">ISO date & time</option>
              </select></label>}
              <label className="value-map-field"><span>Value map</span><input placeholder="MQL=Marketing Qualified; SQL=Sales Qualified" value={mappingText(column)} onChange={(event) => updateColumn(column.id, (current) => {
                const mappings = parseMappings(event.target.value);
                const { valueMappings: _valueMappings, ...withoutMappings } = current;
                return mappings ? { ...withoutMappings, valueMappings: mappings } : withoutMappings;
              })} /></label>
            </div>
            <label className="required-toggle"><input type="checkbox" checked={column.required ?? false} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, required: event.target.checked }))} />Required</label>
            <button className="icon-danger-button" type="button" aria-label={`Remove ${column.header}`} onClick={() => setDraft((current) => ({ ...current, columns: current.columns.filter((item) => item.id !== column.id) }))}>×</button>
          </article>
        ))}
      </div>
      <div className="custom-template-actions">
        <label className="button secondary sample-template-button">
          {busy === "sample" ? "Reading…" : "Create from sample file"}
          <input className="visually-hidden" type="file" accept=".csv,.tsv,.xlsx,.xls" onChange={(event) => void importSample(event)} />
        </label>
      </div>
      </>}

      {workflow.mode === "template" && <div className="template-configuration">
        <div><h3>Template configuration</h3><p>{draft.destinationType}{draft.sheetName ? ` · Worksheet: ${draft.sheetName}` : ""}</p></div>
        <ol>{draft.columns.map((column) => <li key={column.id}><strong>{column.header || "(blank header)"}</strong><span>{sourceLabel(column)}</span></li>)}</ol>
      </div>}

      {parameterColumns.length > 0 && <div className="export-parameters">
        <div><h3>Values for this export</h3><p>These values apply to every exported row and are not saved unless set as a prompt default.</p></div>
        <div className="parameter-grid">{parameterColumns.map((column) => {
          if (column.source.kind !== "parameter") return null;
          const source = column.source;
          return <label key={source.key}><span>{source.label}{column.required ? " *" : ""}</span><input value={parameters[source.key] ?? ""} placeholder={source.defaultValue} onChange={(event) => setParameters((current) => ({ ...current, [source.key]: event.target.value }))} /></label>;
        })}</div>
      </div>}

      <div className="export-preview-block">
        <div className="export-preview-heading">
          <div><h3>Exact output preview</h3><p>First {Math.min(5, result.ready.length)} of {result.ready.length} ready rows.</p></div>
          {uniqueIssues.length > 0 && <span className="validation-count">{output.issues.length} validation issue{output.issues.length === 1 ? "" : "s"}</span>}
        </div>
        {uniqueIssues.length > 0 && <ul className="export-validation-list">{uniqueIssues.slice(0, 5).map((issue) => <li key={`${issue.columnId}-${issue.message}`}>{issue.message}</li>)}{uniqueIssues.length > 5 && <li>And {uniqueIssues.length - 5} more.</li>}</ul>}
        <div className="export-preview-table-wrap"><table className="export-preview-table"><thead><tr>{output.columns.map((column) => <th key={column.key}>{column.header || "(blank header)"}</th>)}</tr></thead><tbody>{previewRows.map((row, rowIndex) => <tr key={rowIndex}>{output.columns.map((column) => <td key={column.key}>{displayExportValue(row[column.key])}</td>)}</tr>)}</tbody></table></div>
      </div>

      <div className="prepare-export-actions">
        <div className="template-management-actions">
          {workflow.mode === "custom" && <button className="button secondary" type="button" disabled={busy !== null || !draft.name.trim()} onClick={() => void saveTemplate()}>{busy === "save" ? "Saving…" : "Save as workspace template"}</button>}
          {workflow.mode === "template" && !draft.builtIn && <button className="text-danger-button" type="button" disabled={busy !== null} onClick={() => void deleteTemplate()}>{busy === "delete" ? "Deleting…" : "Delete template"}</button>}
        </div>
        <div className="download-ready-actions">
          <label><span>File format</span><select value={format} onChange={(event) => setFormat(event.target.value as DataExportFormat)}>{FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <button className="button primary" type="button" disabled={busy !== null || output.issues.length > 0 || result.ready.length === 0} onClick={() => void download()}>{busy === "download" ? "Creating…" : `Export ${result.ready.length} ready rows`}</button>
        </div>
      </div>
    </section>
  );
}
