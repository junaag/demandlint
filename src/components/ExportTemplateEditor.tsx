import { useState } from "react";
import type { ExportTemplate, ExportTemplateColumn, ExportColumnSource, ExportDatePattern, ExportValueFormat, ExportValidationRule, EmptyValueHandling } from "../application/exportTemplates";
import { CANONICAL_FIELD_OPTIONS, emptyValueHandlingFor, templateColumnId } from "../application/exportTemplates";
import type { CanonicalField } from "../application/public";
import type { DataExportFormat } from "../application/exportFileName";

const FORMAT_OPTIONS: Array<{ value: DataExportFormat; label: string }> = [
  { value: "csv", label: "CSV (comma)" }, { value: "csv-semicolon", label: "CSV (semicolon)" },
  { value: "tsv", label: "TSV (tab)" }, { value: "xlsx", label: "Excel (.xlsx)" }, { value: "xls", label: "Excel 97–2003 (.xls)" },
];

function parseMappings(value: string): Array<{ from: string; to: string }> | undefined {
  const mappings = value.split(";").map((pair) => {
    const separator = pair.indexOf("=");
    return separator < 0 ? null : { from: pair.slice(0, separator).trim(), to: pair.slice(separator + 1).trim() };
  }).filter((item): item is { from: string; to: string } => Boolean(item?.from));
  return mappings.length > 0 ? mappings : undefined;
}

function mappingText(column: ExportTemplateColumn): string { return column.valueMappings?.map((item) => `${item.from}=${item.to}`).join("; ") ?? ""; }
function directAllowedValues(column: ExportTemplateColumn): string[] | undefined { return column.validationRules?.find((rule): rule is Extract<ExportValidationRule, { kind: "allowedValues" }> => rule.kind === "allowedValues")?.values; }
function dependentAllowedValues(column: ExportTemplateColumn): Extract<ExportValidationRule, { kind: "dependentAllowedValues" }> | undefined { return column.validationRules?.find((rule): rule is Extract<ExportValidationRule, { kind: "dependentAllowedValues" }> => rule.kind === "dependentAllowedValues"); }

function SourceFieldControl({ column, customFieldInputVisible, onCustomFieldInputVisibilityChange, updateColumn }: { column: ExportTemplateColumn; customFieldInputVisible: boolean; onCustomFieldInputVisibilityChange: (visible: boolean) => void; updateColumn: (update: (column: ExportTemplateColumn) => ExportTemplateColumn) => void }) {
  if (column.source.kind !== "canonical" && column.source.kind !== "custom") return null;
  const hasCustomField = column.source.kind === "custom" && Boolean(column.source.key);
  const selection = column.source.kind === "canonical" ? `canonical:${column.source.field}` : hasCustomField || customFieldInputVisible ? "custom" : "unmapped";
  return <label className="source-field-selection"><span>Source field</span><small>Select a source field from the imported dataset.</small><div className="source-field-control"><select value={selection} onChange={(event) => {
    const value = event.target.value;
    if (value === "unmapped") { onCustomFieldInputVisibilityChange(false); updateColumn((current) => ({ ...current, source: { kind: "custom", key: "" } })); return; }
    if (value === "custom") { onCustomFieldInputVisibilityChange(true); updateColumn((current) => ({ ...current, source: { kind: "custom", key: current.source.kind === "custom" ? current.source.key : "" } })); return; }
    onCustomFieldInputVisibilityChange(false);
    updateColumn((current) => ({ ...current, source: { kind: "canonical", field: value.slice("canonical:".length) as CanonicalField } }));
  }}><option value="unmapped">Select source field</option>{CANONICAL_FIELD_OPTIONS.map((option) => <option key={option.value} value={`canonical:${option.value}`}>{option.label}</option>)}<option value="custom">Other imported field…</option></select>{column.source.kind === "custom" && (hasCustomField || customFieldInputVisible) && <input value={column.source.key} placeholder="Other imported field name" onChange={(event) => updateColumn((current) => ({ ...current, source: { kind: "custom", key: event.target.value } }))} />}</div></label>;
}

function DateFormatField({ column, updateColumn }: { column: ExportTemplateColumn; updateColumn: (update: (column: ExportTemplateColumn) => ExportTemplateColumn) => void }) {
  if (column.format !== "date" && column.format !== "datetime") return null;
  const isDateTime = column.format === "datetime";
  return <label><span>Date format</span><select value={column.datePattern ?? (isDateTime ? "iso-datetime" : "yyyy-MM-dd")} onChange={(event) => updateColumn((current) => ({ ...current, datePattern: event.target.value as ExportDatePattern }))}>
    {isDateTime ? <><option value="yyyy-MM-dd HH:mm">YYYY-MM-DD HH:MM — 2026-08-26 14:30</option><option value="yyyy-MM-dd HH:mm:ss">YYYY-MM-DD HH:MM:SS — 2026-08-26 14:30:00</option><option value="yyyy/MM/dd HH:mm">YYYY/MM/DD HH:MM — 2026/08/26 14:30</option><option value="dd/MM/yyyy HH:mm">DD/MM/YYYY HH:MM — 26/08/2026 14:30</option><option value="dd/MM/yyyy HH:mm:ss">DD/MM/YYYY HH:MM:SS — 26/08/2026 14:30:00</option><option value="MM/dd/yyyy HH:mm">MM/DD/YYYY HH:MM — 08/26/2026 14:30</option><option value="MM/dd/yyyy HH:mm:ss">MM/DD/YYYY HH:MM:SS — 08/26/2026 14:30:00</option><option value="dd/MM/yy HH:mm">DD/MM/YY HH:MM — 26/08/26 14:30</option><option value="MM/dd/yy HH:mm">MM/DD/YY HH:MM — 08/26/26 14:30</option><option value="MM/dd/yyyy hh:mm AM/PM">MM/DD/YYYY hh:mm AM/PM — 08/26/2026 02:30 PM</option><option value="dd/MM/yyyy hh:mm AM/PM">DD/MM/YYYY hh:mm AM/PM — 26/08/2026 02:30 PM</option><option value="iso-datetime">ISO 8601 UTC — 2026-08-26T14:30:00Z</option></> : <><option value="yyyy-MM-dd">YYYY-MM-DD — 2026-08-26</option><option value="yyyy/MM/dd">YYYY/MM/DD — 2026/08/26</option><option value="dd/MM/yyyy">DD/MM/YYYY — 26/08/2026</option><option value="MM/dd/yyyy">MM/DD/YYYY — 08/26/2026</option><option value="dd-MM-yyyy">DD-MM-YYYY — 26-08-2026</option><option value="MM-dd-yyyy">MM-DD-YYYY — 08-26-2026</option><option value="dd.MM.yyyy">DD.MM.YYYY — 26.08.2026</option><option value="MM.dd.yyyy">MM.DD.YYYY — 08.26.2026</option><option value="yyyyMMdd">YYYYMMDD — 20260826</option><option value="dd/MM/yy">DD/MM/YY — 26/08/26</option><option value="MM/dd/yy">MM/DD/YY — 08/26/26</option></>}
  </select></label>;
}

interface ExportTemplateEditorProps { template: ExportTemplate; onChange: (template: ExportTemplate) => void; heading?: string; }

export function ExportTemplateEditor({ template, onChange, heading = "Template configuration" }: ExportTemplateEditorProps) {
  const [customFieldInputIds, setCustomFieldInputIds] = useState<Set<string>>(() => new Set());
  function setCustomFieldInputVisibility(id: string, visible: boolean) { setCustomFieldInputIds((current) => { const next = new Set(current); if (visible) next.add(id); else next.delete(id); return next; }); }
  function updateColumn(id: string, update: (column: ExportTemplateColumn) => ExportTemplateColumn) { onChange({ ...template, columns: template.columns.map((column) => column.id === id ? update(column) : column) }); }
  function changeSource(column: ExportTemplateColumn, kind: "mapped" | "fixed" | "empty") {
    const source: ExportColumnSource = kind === "mapped" ? { kind: "custom", key: "" } : kind === "fixed" ? { kind: "fixed" } : { kind: "empty" };
    setCustomFieldInputVisibility(column.id, false);
    updateColumn(column.id, (current) => {
      if (kind === "empty") { const { emptyValueHandling: _handling, valueMappings: _mappings, ...rest } = current; return { ...rest, source }; }
      return { ...current, source, emptyValueHandling: current.emptyValueHandling ?? (kind === "fixed" ? { kind: "required" } : { kind: "leaveBlank" }) };
    });
  }
  function moveColumn(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= template.columns.length) return; const columns = [...template.columns]; [columns[index], columns[target]] = [columns[target]!, columns[index]!]; onChange({ ...template, columns }); }
  function setEmptyHandling(id: string, kind: EmptyValueHandling["kind"]) { updateColumn(id, (current) => { const existing = emptyValueHandlingFor(current); return { ...current, emptyValueHandling: kind === "replace" ? { kind, value: existing.kind === "replace" ? existing.value : "" } : { kind } }; }); }
  return <div className="export-template-editor"><div className="export-template-meta">
    <label><span>Template name</span><input value={template.name} onChange={(event) => onChange({ ...template, name: event.target.value })} /></label>
    <label><span>Destination / system (optional)</span><small>E.g. CRM, event platform or internal process.</small><input value={template.destinationType} onChange={(event) => onChange({ ...template, destinationType: event.target.value })} /></label>
    <label><span>Default output format</span><select value={template.defaultFormat} onChange={(event) => onChange({ ...template, defaultFormat: event.target.value as DataExportFormat })}>{FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    {(template.defaultFormat === "xlsx" || template.defaultFormat === "xls") && <label><span>Worksheet name</span><input maxLength={31} value={template.sheetName ?? ""} onChange={(event) => onChange({ ...template, sheetName: event.target.value })} /></label>}
  </div><div className="export-column-builder"><div className="export-column-builder-heading"><div><h3>{heading}</h3><p>Column order is exact. Leave empty keeps the column but leaves every cell blank.</p></div><button className="button ghost" type="button" onClick={() => onChange({ ...template, columns: [...template.columns, { id: templateColumnId(), header: "New column", source: { kind: "empty" }, format: "text" }] })}>Add column</button></div>
    {template.columns.map((column, index) => {
      const isMapped = column.source.kind === "canonical" || column.source.kind === "custom"; const allowed = directAllowedValues(column); const dependent = dependentAllowedValues(column); const handling = emptyValueHandlingFor(column); const update = (next: (current: ExportTemplateColumn) => ExportTemplateColumn) => updateColumn(column.id, next);
      return <article className="export-column-card" key={column.id}><header className="export-column-card-header"><div className="column-order"><strong>{index + 1}</strong><button className="column-action-button" type="button" aria-label="Move column up" disabled={index === 0} onClick={() => moveColumn(index, -1)}>↑</button><button className="column-action-button" type="button" aria-label="Move column down" disabled={index === template.columns.length - 1} onClick={() => moveColumn(index, 1)}>↓</button></div><div className="column-card-actions"><button className="column-action-button danger" type="button" aria-label={`Remove ${column.header}`} onClick={() => onChange({ ...template, columns: template.columns.filter((item) => item.id !== column.id) })}>×</button></div></header><div className="export-column-fields">
        <label><span>Column name</span><small>Name of the column in the exported file.</small><input value={column.header} onChange={(event) => update((current) => ({ ...current, header: event.target.value }))} /></label>
        <label><span>Column source</span><small>Choose where the value for this output column comes from.</small><select value={column.source.kind === "empty" ? "empty" : column.source.kind === "fixed" || column.source.kind === "parameter" ? "fixed" : "mapped"} onChange={(event) => changeSource(column, event.target.value as "mapped" | "fixed" | "empty")}><option value="mapped">Mapped field</option><option value="fixed">Fixed field</option><option value="empty">Leave empty</option></select></label>
        <SourceFieldControl column={column} customFieldInputVisible={customFieldInputIds.has(column.id)} onCustomFieldInputVisibilityChange={(visible) => setCustomFieldInputVisibility(column.id, visible)} updateColumn={update} />
        {column.source.kind !== "empty" && <><label><span>Value type</span><select value={column.format ?? "text"} onChange={(event) => update((current) => ({ ...current, format: event.target.value as ExportValueFormat }))}><option value="text">Text / identifier</option><option value="number">Number</option><option value="date">Date</option><option value="datetime">Date & time</option><option value="boolean">Yes / No</option></select></label><DateFormatField column={column} updateColumn={update} /></>}
        {(allowed || dependent) && <details className="optional-rules allowed-values-reference"><summary>Allowed values · {allowed ? `${allowed.length} values` : `Depends on ${template.columns.find((item) => item.id === dependent!.parentColumnId)?.header ?? "another field"} · ${Object.keys(dependent!.cases).length} cases`}</summary><p>{dependent ? "Reference information only; each group is keyed by its parent value." : "Reference information only; choose fixed values when this template is used."}</p>{allowed ? <div className="allowed-value-chips">{allowed.map((value) => <span key={value}>{value}</span>)}</div> : <div className="dependent-allowed-groups">{Object.entries(dependent!.cases).map(([parent, values]) => <section key={parent}><strong>{parent}</strong><div className="allowed-value-chips">{values.map((value) => <span key={value}>{value}</span>)}</div></section>)}</div>}</details>}
        {column.source.kind !== "empty" && <fieldset className="empty-value-handling"><legend>Empty value handling</legend><label><input type="radio" checked={handling.kind === "required"} onChange={() => setEmptyHandling(column.id, "required")} />Value required</label><label><input type="radio" checked={handling.kind === "replace"} onChange={() => setEmptyHandling(column.id, "replace")} />Replace empty value with…</label>{handling.kind === "replace" && (allowed ? <select value={handling.value} onChange={(event) => update((current) => ({ ...current, emptyValueHandling: { kind: "replace", value: event.target.value } }))}><option value="">Select a value</option>{allowed.map((value) => <option key={value} value={value}>{value}</option>)}</select> : <input value={handling.value} onChange={(event) => update((current) => ({ ...current, emptyValueHandling: { kind: "replace", value: event.target.value } }))} />)}<label><input type="radio" checked={handling.kind === "leaveBlank"} onChange={() => setEmptyHandling(column.id, "leaveBlank")} />If value is empty, leave blank</label></fieldset>}
        {isMapped && <details className="optional-rules"><summary>Replace values</summary><label className="value-map-field"><small>Optionally normalize source values before final validation.</small><input placeholder="Information Technology=IT" value={mappingText(column)} onChange={(event) => update((current) => { const valueMappings = parseMappings(event.target.value); if (valueMappings) return { ...current, valueMappings }; const { valueMappings: _mappings, ...withoutMappings } = current; return withoutMappings; })} /></label></details>}
        {column.sourceValidationWarnings?.length && <p className="validation-warning">{column.sourceValidationWarnings.join(" ")}</p>}
      </div></article>;
    })}
  </div></div>;
}
