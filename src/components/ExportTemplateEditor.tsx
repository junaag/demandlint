import type { ExportTemplate, ExportTemplateColumn, ExportColumnSource, ExportDatePattern, ExportValueFormat } from "../application/exportTemplates";
import { CANONICAL_FIELD_OPTIONS, templateColumnId } from "../application/exportTemplates";
import type { CanonicalField } from "../application/public";
import type { DataExportFormat } from "../application/exportFileName";

const FORMAT_OPTIONS: Array<{ value: DataExportFormat; label: string }> = [
  { value: "csv", label: "CSV (comma)" },
  { value: "csv-semicolon", label: "CSV (semicolon)" },
  { value: "tsv", label: "TSV (tab)" },
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "xls", label: "Excel 97–2003 (.xls)" },
];

function parameterKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "export_value";
}

function parseMappings(value: string): Array<{ from: string; to: string }> | undefined {
  const mappings = value.split(";").map((pair) => {
    const separator = pair.indexOf("=");
    return separator < 0 ? null : { from: pair.slice(0, separator).trim(), to: pair.slice(separator + 1).trim() };
  }).filter((item): item is { from: string; to: string } => Boolean(item?.from));
  return mappings.length > 0 ? mappings : undefined;
}

function mappingText(column: ExportTemplateColumn): string {
  return column.valueMappings?.map((item) => `${item.from}=${item.to}`).join("; ") ?? "";
}

interface ExportTemplateEditorProps {
  template: ExportTemplate;
  onChange: (template: ExportTemplate) => void;
  heading?: string;
}

export function ExportTemplateEditor({ template, onChange, heading = "Template configuration" }: ExportTemplateEditorProps) {
  function updateColumn(id: string, update: (column: ExportTemplateColumn) => ExportTemplateColumn) {
    onChange({ ...template, columns: template.columns.map((column) => column.id === id ? update(column) : column) });
  }

  function changeSource(column: ExportTemplateColumn, kind: ExportColumnSource["kind"]) {
    const source: ExportColumnSource = kind === "canonical"
      ? { kind, field: "email" }
      : kind === "custom"
        ? { kind, key: "" }
        : kind === "parameter"
          ? { kind, key: parameterKey(column.header), label: column.header || "Value" }
          : { kind: "empty" };
    updateColumn(column.id, (current) => kind === "empty"
      ? (() => { const { defaultValue: _defaultValue, format: _format, datePattern: _datePattern, valueMappings: _valueMappings, ...clean } = current; return { ...clean, source, required: false }; })()
      : { ...current, source });
  }

  function moveColumn(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= template.columns.length) return;
    const columns = [...template.columns];
    [columns[index], columns[target]] = [columns[target]!, columns[index]!];
    onChange({ ...template, columns });
  }

  return (
    <div className="export-template-editor">
      <div className="export-template-meta">
        <label><span>Template name</span><input value={template.name} onChange={(event) => onChange({ ...template, name: event.target.value })} /></label>
        <label><span>Destination / system (optional)</span><small>For your reference only, e.g. CRM, event platform or internal process.</small><input value={template.destinationType} onChange={(event) => onChange({ ...template, destinationType: event.target.value })} /></label>
        <label><span>Default output format</span><select value={template.defaultFormat} onChange={(event) => onChange({ ...template, defaultFormat: event.target.value as DataExportFormat })}>{FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        {(template.defaultFormat === "xlsx" || template.defaultFormat === "xls") && <label><span>Worksheet name</span><input maxLength={31} value={template.sheetName ?? ""} onChange={(event) => onChange({ ...template, sheetName: event.target.value })} /></label>}
      </div>

      <div className="export-column-builder">
        <div className="export-column-builder-heading">
          <div><h3>{heading}</h3><p>Column order is exact. Empty keeps the column but leaves every cell blank.</p></div>
          <button className="button ghost" type="button" onClick={() => onChange({ ...template, columns: [...template.columns, { id: templateColumnId(), header: "New column", source: { kind: "empty" }, format: "text" }] })}>Add column</button>
        </div>
        {template.columns.map((column, index) => (
          <article className="export-column-card" key={column.id}>
            <header className="export-column-card-header">
              <div className="column-order"><strong>{index + 1}</strong><span>{column.header || "Untitled column"}</span></div>
              <div className="column-card-actions">
                <button className="column-action-button" type="button" aria-label="Move column up" disabled={index === 0} onClick={() => moveColumn(index, -1)}>↑</button>
                <button className="column-action-button" type="button" aria-label="Move column down" disabled={index === template.columns.length - 1} onClick={() => moveColumn(index, 1)}>↓</button>
                <button className="column-action-button danger" type="button" aria-label={`Remove ${column.header}`} onClick={() => onChange({ ...template, columns: template.columns.filter((item) => item.id !== column.id) })}>×</button>
              </div>
            </header>
            <div className="export-column-fields">
              <label><span>Column name</span><small>Name of the column in the exported file.</small><input value={column.header} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, header: event.target.value }))} /></label>
              <label><span>Value comes from</span><select value={column.source.kind} onChange={(event) => changeSource(column, event.target.value as ExportColumnSource["kind"])}><option value="canonical">Default field</option><option value="custom">Custom field</option><option value="parameter">Fixed value</option><option value="empty">Leave empty</option></select></label>
              {column.source.kind === "canonical" && <label><span>Field</span><small>Use a standard field recognized and normalized by DemandLint.</small><select value={column.source.field} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { kind: "canonical", field: event.target.value as CanonicalField } }))}>{CANONICAL_FIELD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
              {column.source.kind === "custom" && <label><span>Custom field</span><small>Use another field from the imported file that is not part of the standard DemandLint fields.</small><input value={column.source.key} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { kind: "custom", key: event.target.value } }))} /></label>}
              {column.source.kind === "parameter" && <><label><span>Value requested at export</span><small>Enter one value when exporting. The same value will be used for every row.</small><input value={column.source.label} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { ...column.source, label: event.target.value, key: parameterKey(event.target.value) } }))} /></label><label><span>Default value (optional)</span><input value={column.source.defaultValue ?? ""} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { ...column.source, defaultValue: event.target.value } }))} /></label></>}
              {(column.source.kind === "canonical" || column.source.kind === "custom") && <details className="optional-rules"><summary>Optional rules</summary><label><span>Use this value if empty</span><small>Used only when the selected source does not contain a value.</small><input value={column.defaultValue ?? ""} onChange={(event) => updateColumn(column.id, (current) => event.target.value ? { ...current, defaultValue: event.target.value } : (() => { const { defaultValue: _value, ...withoutDefault } = current; return withoutDefault; })())} /></label><label><span>Value type</span><small>Controls how the value is written in the exported file.</small><select value={column.format ?? "text"} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, format: event.target.value as ExportValueFormat }))}><option value="text">Text / identifier</option><option value="number">Number</option><option value="date">Date</option><option value="datetime">Date & time</option><option value="boolean">Yes / No</option></select></label><label className="value-map-field"><span>Replace values</span><small>Optionally replace specific source values with the values expected in the exported file.</small><input placeholder="Yes=1; No=0" value={mappingText(column)} onChange={(event) => updateColumn(column.id, (current) => { const mappings = parseMappings(event.target.value); if (mappings) return { ...current, valueMappings: mappings }; const { valueMappings: _valueMappings, ...withoutMappings } = current; return withoutMappings; })} /></label></details>}
              {column.source.kind === "parameter" && <label><span>Value type</span><small>Controls how the value is written in the exported file.</small><select value={column.format ?? "text"} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, format: event.target.value as ExportValueFormat }))}><option value="text">Text / identifier</option><option value="number">Number</option><option value="date">Date</option><option value="datetime">Date & time</option><option value="boolean">Yes / No</option></select></label>}
              {column.source.kind !== "empty" && (column.format === "date" || column.format === "datetime") && <label><span>Date format</span><select value={column.datePattern ?? (column.format === "datetime" ? "iso-datetime" : "yyyy-MM-dd")} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, datePattern: event.target.value as ExportDatePattern }))}><option value="yyyy-MM-dd">YYYY-MM-DD</option><option value="yyyy/MM/dd">YYYY/MM/DD</option><option value="MM/dd/yyyy">MM/DD/YYYY</option><option value="dd/MM/yyyy">DD/MM/YYYY</option><option value="iso-datetime">ISO date & time</option></select></label>}
            </div>
            {column.source.kind !== "empty" && <footer className="export-column-card-footer"><label className="required-toggle"><input type="checkbox" checked={column.required ?? false} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, required: event.target.checked }))} />Required for export</label></footer>}
          </article>
        ))}
      </div>
    </div>
  );
}
