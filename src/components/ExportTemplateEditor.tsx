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

function DateFormatField({ column, updateColumn }: { column: ExportTemplateColumn; updateColumn: (update: (column: ExportTemplateColumn) => ExportTemplateColumn) => void }) {
  if (column.format !== "date" && column.format !== "datetime") return null;
  const isDateTime = column.format === "datetime";
  return <label><span>Date format</span><select value={column.datePattern ?? (isDateTime ? "iso-datetime" : "yyyy-MM-dd")} onChange={(event) => updateColumn((current) => ({ ...current, datePattern: event.target.value as ExportDatePattern }))}>
    {isDateTime ? <option value="iso-datetime">2026-08-25 14:30 UTC</option> : <><option value="yyyy-MM-dd">2026-08-25</option><option value="yyyy/MM/dd">2026/08/25</option><option value="dd/MM/yyyy">25/08/2026</option><option value="MM/dd/yyyy">08/25/2026</option></>}
  </select></label>;
}

interface ExportTemplateEditorProps { template: ExportTemplate; onChange: (template: ExportTemplate) => void; heading?: string; }

export function ExportTemplateEditor({ template, onChange, heading = "Template configuration" }: ExportTemplateEditorProps) {
  function updateColumn(id: string, update: (column: ExportTemplateColumn) => ExportTemplateColumn) { onChange({ ...template, columns: template.columns.map((column) => column.id === id ? update(column) : column) }); }
  function changeSource(column: ExportTemplateColumn, kind: "mapped" | "fixed" | "empty") {
    const source: ExportColumnSource = kind === "mapped" ? { kind: "canonical", field: "email" } : kind === "fixed" ? { kind: "fixed" } : { kind: "empty" };
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
        {(column.source.kind === "canonical" || column.source.kind === "custom") && <label><span>Source field</span><small>Select a source field from the imported dataset.</small>{column.source.kind === "canonical" ? <select value={`canonical:${column.source.field}`} onChange={(event) => { const value = event.target.value; update((current) => value === "custom" ? { ...current, source: { kind: "custom", key: "" } } : { ...current, source: { kind: "canonical", field: value.slice("canonical:".length) as CanonicalField } }); }}><option value="custom">Other imported field…</option>{CANONICAL_FIELD_OPTIONS.map((option) => <option key={option.value} value={`canonical:${option.value}`}>{option.label}</option>)}</select> : <input value={column.source.key} placeholder="Source field name" onChange={(event) => update((current) => ({ ...current, source: { kind: "custom", key: event.target.value } }))} />}</label>}
        {column.source.kind !== "empty" && <><label><span>Value type</span><select value={column.format ?? "text"} onChange={(event) => update((current) => ({ ...current, format: event.target.value as ExportValueFormat }))}><option value="text">Text / identifier</option><option value="number">Number</option><option value="date">Date</option><option value="datetime">Date & time</option><option value="boolean">Yes / No</option></select></label><DateFormatField column={column} updateColumn={update} /></>}
        {(allowed || dependent) && <details className="optional-rules"><summary>Allowed values · {allowed ? `${allowed.length} values` : `Depends on ${template.columns.find((item) => item.id === dependent!.parentColumnId)?.header ?? "another field"} · ${Object.keys(dependent!.cases).length} cases`}</summary><p>{dependent ? `Dependent allowed-value sets · ${Object.keys(dependent.cases).length} cases` : "Reference information only; choose fixed values when this template is used."}</p><ul>{(allowed ?? Object.entries(dependent!.cases).flatMap(([parent, values]) => [`${parent}: ${values.join(", ")}`])).slice(0, 24).map((value) => <li key={value}>{value}</li>)}</ul>{(allowed?.length ?? 0) > 24 && <p>Additional values are available in this rule.</p>}</details>}
        {column.source.kind !== "empty" && <fieldset className="empty-value-handling"><legend>Empty value handling</legend><label><input type="radio" checked={handling.kind === "required"} onChange={() => setEmptyHandling(column.id, "required")} />Value required</label><label><input type="radio" checked={handling.kind === "replace"} onChange={() => setEmptyHandling(column.id, "replace")} />Replace empty value with…</label>{handling.kind === "replace" && (allowed ? <select value={handling.value} onChange={(event) => update((current) => ({ ...current, emptyValueHandling: { kind: "replace", value: event.target.value } }))}><option value="">Select a value</option>{allowed.map((value) => <option key={value} value={value}>{value}</option>)}</select> : <input value={handling.value} onChange={(event) => update((current) => ({ ...current, emptyValueHandling: { kind: "replace", value: event.target.value } }))} />)}<label><input type="radio" checked={handling.kind === "leaveBlank"} onChange={() => setEmptyHandling(column.id, "leaveBlank")} />If value is empty, leave blank</label></fieldset>}
        {isMapped && <details className="optional-rules"><summary>Replace values</summary><label className="value-map-field"><small>Optionally normalize source values before final validation.</small><input placeholder="Information Technology=IT" value={mappingText(column)} onChange={(event) => update((current) => { const valueMappings = parseMappings(event.target.value); if (valueMappings) return { ...current, valueMappings }; const { valueMappings: _mappings, ...withoutMappings } = current; return withoutMappings; })} /></label></details>}
        {column.sourceValidationWarnings?.length && <p className="validation-warning">{column.sourceValidationWarnings.join(" ")}</p>}
      </div></article>;
    })}
  </div></div>;
}
