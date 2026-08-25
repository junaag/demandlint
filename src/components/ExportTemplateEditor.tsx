import type { ExportTemplate, ExportTemplateColumn, ExportColumnSource, ExportDatePattern, ExportValueFormat, ExportValidationRule } from "../application/exportTemplates";
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

function directAllowedValues(column: ExportTemplateColumn): string[] | undefined {
  return column.validationRules?.find((rule): rule is Extract<ExportValidationRule, { kind: "allowedValues" }> => rule.kind === "allowedValues")?.values;
}

function validationSummary(column: ExportTemplateColumn): string {
  const rules = column.validationRules ?? (column.required ? [{ kind: "required" as const }] : []);
  if (rules.length === 0) return "No validation rules";
  if (rules.length === 1 && rules[0]?.kind === "required") return "Required";
  const allowed = rules.find((rule) => rule.kind === "allowedValues");
  if (allowed?.kind === "allowedValues") return `${allowed.values.length} allowed values`;
  const dependent = rules.find((rule) => rule.kind === "dependentAllowedValues");
  if (dependent?.kind === "dependentAllowedValues") return `Allowed values depend on another field · ${Object.keys(dependent.cases).length} cases`;
  return `${rules.length} validation rules`;
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

  function changeSource(column: ExportTemplateColumn, kind: "mapped" | "fixed" | "empty") {
    const source: ExportColumnSource = kind === "mapped"
      ? { kind: "canonical", field: "email" }
      : kind === "fixed" ? { kind: "fixed", value: "" } : { kind: "empty" };
    updateColumn(column.id, (current) => kind === "empty"
      ? (() => { const { defaultValue: _defaultValue, format: _format, datePattern: _datePattern, valueMappings: _valueMappings, ...clean } = current; return { ...clean, source }; })()
      : { ...current, source });
  }

  function moveColumn(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= template.columns.length) return;
    const columns = [...template.columns];
    [columns[index], columns[target]] = [columns[target]!, columns[index]!];
    onChange({ ...template, columns });
  }

  function requiredField(column: ExportTemplateColumn) {
    if (column.source.kind === "empty") return null;
    const required = column.validationRules?.some((rule) => rule.kind === "required") ?? column.required ?? false;
    return <label className="required-toggle"><span>Required</span><small>Export is blocked if this final value is empty.</small><input type="checkbox" checked={required} onChange={(event) => updateColumn(column.id, (current) => {
      const rules = (current.validationRules ?? []).filter((rule) => rule.kind !== "required");
      const { required: _legacyRequired, ...withoutLegacyRequired } = current;
      return { ...withoutLegacyRequired, ...(event.target.checked ? { validationRules: [{ kind: "required", outcome: "block" }, ...rules] } : rules.length ? { validationRules: rules } : {}) };
    })} /></label>;
  }

  return (
    <div className="export-template-editor">
      <div className="export-template-meta">
        <label><span>Template name</span><input value={template.name} onChange={(event) => onChange({ ...template, name: event.target.value })} /></label>
        <label><span>Destination / system (optional)</span><small>E.g. CRM, event platform or internal process.</small><input value={template.destinationType} onChange={(event) => onChange({ ...template, destinationType: event.target.value })} /></label>
        <label><span>Default output format</span><select value={template.defaultFormat} onChange={(event) => onChange({ ...template, defaultFormat: event.target.value as DataExportFormat })}>{FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        {(template.defaultFormat === "xlsx" || template.defaultFormat === "xls") && <label><span>Worksheet name</span><input maxLength={31} value={template.sheetName ?? ""} onChange={(event) => onChange({ ...template, sheetName: event.target.value })} /></label>}
      </div>

      <div className="export-column-builder">
        <div className="export-column-builder-heading">
          <div><h3>{heading}</h3><p>Column order is exact. Leave empty keeps the column but leaves every cell blank.</p></div>
          <button className="button ghost" type="button" onClick={() => onChange({ ...template, columns: [...template.columns, { id: templateColumnId(), header: "New column", source: { kind: "empty" }, format: "text" }] })}>Add column</button>
        </div>
        {template.columns.map((column, index) => (
          <article className="export-column-card" key={column.id}>
            <header className="export-column-card-header">
              <div className="column-order"><strong>{index + 1}</strong><button className="column-action-button" type="button" aria-label="Move column up" disabled={index === 0} onClick={() => moveColumn(index, -1)}>↑</button><button className="column-action-button" type="button" aria-label="Move column down" disabled={index === template.columns.length - 1} onClick={() => moveColumn(index, 1)}>↓</button></div>
              <div className="column-card-actions">
                <button className="column-action-button danger" type="button" aria-label={`Remove ${column.header}`} onClick={() => onChange({ ...template, columns: template.columns.filter((item) => item.id !== column.id) })}>×</button>
              </div>
            </header>
            <div className="export-column-fields">
              <label><span>Column name</span><small>Name of the column in the exported file.</small><input value={column.header} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, header: event.target.value }))} /></label>
              <label><span>Value Source</span><small>Choose where DemandLint should get the value for this column.</small><select value={column.source.kind === "empty" ? "empty" : column.source.kind === "fixed" || column.source.kind === "parameter" ? "fixed" : "mapped"} onChange={(event) => changeSource(column, event.target.value as "mapped" | "fixed" | "empty")}><option value="mapped">Mapped field</option><option value="fixed">Fixed value</option><option value="empty">Leave empty</option></select></label>
              {(column.source.kind === "canonical" || column.source.kind === "custom") && <label><span>Source field</span><small>Select a DemandLint field or enter another source field.</small>{column.source.kind === "canonical" ? <select value={`canonical:${column.source.field}`} onChange={(event) => { const value = event.target.value; updateColumn(column.id, (current) => value === "custom" ? { ...current, source: { kind: "custom", key: "" } } : { ...current, source: { kind: "canonical", field: value.slice("canonical:".length) as CanonicalField } }); }}>{CANONICAL_FIELD_OPTIONS.map((option) => <option key={option.value} value={`canonical:${option.value}`}>{option.label}</option>)}<option value="custom">Other imported field…</option></select> : <input value={column.source.key} placeholder="Source field name" onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { kind: "custom", key: event.target.value } }))} />}</label>}
              {column.source.kind === "fixed" && <label><span>Fixed value</span>{directAllowedValues(column) ? <select value={column.source.value} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { kind: "fixed", value: event.target.value } }))}><option value="">Select a value</option>{directAllowedValues(column)!.map((value) => <option key={value} value={value}>{value}</option>)}</select> : <input value={column.source.value} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { kind: "fixed", value: event.target.value } }))} />}</label>}
              {column.source.kind === "parameter" && <label><span>Fixed value</span><small>This legacy template requests a value at export.</small><input value={column.source.label} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { ...column.source, label: event.target.value, key: parameterKey(event.target.value) } }))} /></label>}
              {requiredField(column)}
              {(column.source.kind === "canonical" || column.source.kind === "custom") && <details className="optional-rules"><summary>Optional rules</summary><label><span>If empty, use</span><small>Used only when the selected source does not contain a value.</small>{directAllowedValues(column) ? <select value={column.defaultValue ?? ""} onChange={(event) => updateColumn(column.id, (current) => event.target.value ? { ...current, defaultValue: event.target.value } : (() => { const { defaultValue: _value, ...withoutDefault } = current; return withoutDefault; })())}><option value="">Leave empty</option>{directAllowedValues(column)!.map((value) => <option key={value} value={value}>{value}</option>)}</select> : <input value={column.defaultValue ?? ""} onChange={(event) => updateColumn(column.id, (current) => event.target.value ? { ...current, defaultValue: event.target.value } : (() => { const { defaultValue: _value, ...withoutDefault } = current; return withoutDefault; })())} />}</label><label><span>Value type</span><small>Controls how the value is written in the exported file.</small><select value={column.format ?? "text"} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, format: event.target.value as ExportValueFormat }))}><option value="text">Text / identifier</option><option value="number">Number</option><option value="date">Date</option><option value="datetime">Date & time</option><option value="boolean">Yes / No</option></select></label><label className="value-map-field"><span>Replace values</span><small>Optionally replace specific source values with the values expected in the exported file.</small><input placeholder="Yes=1; No=0" value={mappingText(column)} onChange={(event) => updateColumn(column.id, (current) => { const mappings = parseMappings(event.target.value); if (mappings) return { ...current, valueMappings: mappings }; const { valueMappings: _valueMappings, ...withoutMappings } = current; return withoutMappings; })} /></label></details>}
              <details className="optional-rules"><summary>Validation rules · {validationSummary(column)}</summary><p>{column.sourceValidationWarnings?.join(" ") ?? "Rules apply to the final output value after fallback, replacements and formatting."}</p></details>
              {column.source.kind === "parameter" && <><label className="column-secondary-field"><span>Default value (optional)</span><input value={column.source.defaultValue ?? ""} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, source: { ...column.source, defaultValue: event.target.value } }))} /></label><label className="column-secondary-field"><span>Value type</span><small>Controls how the value is written in the exported file.</small><select value={column.format ?? "text"} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, format: event.target.value as ExportValueFormat }))}><option value="text">Text / identifier</option><option value="number">Number</option><option value="date">Date</option><option value="datetime">Date & time</option><option value="boolean">Yes / No</option></select></label></>}
              {column.source.kind !== "empty" && (column.format === "date" || column.format === "datetime") && <label><span>Date format</span><select value={column.datePattern ?? (column.format === "datetime" ? "iso-datetime" : "yyyy-MM-dd")} onChange={(event) => updateColumn(column.id, (current) => ({ ...current, datePattern: event.target.value as ExportDatePattern }))}><option value="yyyy-MM-dd">YYYY-MM-DD</option><option value="yyyy/MM/dd">YYYY/MM/DD</option><option value="MM/dd/yyyy">MM/DD/YYYY</option><option value="dd/MM/yyyy">DD/MM/YYYY</option><option value="iso-datetime">ISO date & time</option></select></label>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
