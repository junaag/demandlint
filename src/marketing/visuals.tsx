import { Check, VisualShell } from "./shared";

export function SpreadsheetRows({ headers, rows, clean = false }: { headers: string[]; rows: string[][]; clean?: boolean }) {
  return <div className={`workflow-stage ${clean ? "workflow-stage-output" : ""}`}>{headers.map((header, index) => <div key={header}><span>{clean ? "✓" : String.fromCharCode(65 + index)}</span><strong>{header}</strong></div>)}{rows.map((row, rowIndex) => <p key={rowIndex}>{row.map((cell, cellIndex) => <span key={`${cell}-${cellIndex}`}>{cell}</span>)}</p>)}</div>;
}

export function WorkflowPreview() {
  return <div className="workflow-preview" aria-label="Raw spreadsheet mapped and validated into a clean export">
    <div className="workflow-preview-topline"><span>Event_leads_raw.xlsx</span><span className="workflow-status"><i /> Ready to prepare</span></div>
    <SpreadsheetRows headers={["First", "Surname", "Nation"]} rows={[["Anna", "Martin", "FR"], ["Jon", "Evans", "USA"]]} />
    <div className="workflow-transform"><MiniStage number="1" title="Map" detail="3 fields matched" /><i aria-hidden="true">→</i><MiniStage number="2" title="Validate" detail="2 rules applied" /></div>
    <SpreadsheetRows clean headers={["First Name", "Last Name", "Country"]} rows={[["Anna", "Martin", "France"], ["Jon", "Evans", "United States"]]} />
    <div className="workflow-export"><span><i /> Validation passed</span><strong>Clean_export.xlsx <span aria-hidden="true">↗</span></strong></div>
  </div>;
}

function MiniStage({ number, title, detail }: { number: string; title: string; detail: string }) { return <div><span className="workflow-step-number">{number}</span><span><strong>{title}</strong><small>{detail}</small></span></div>; }

export function ArchitectureVisual() {
  return <div className="architecture-visual" aria-label="Sources flow through DemandLint to destinations">
    <ArchitectureSide label="Sources" items={["Events", "Partners", "Campaigns", "External providers", "Internal teams"]} />
    <span className="architecture-arrow" aria-hidden="true">→</span>
    <div className="architecture-core"><span className="marketing-brand-mark">D</span><strong>DemandLint</strong><p>Map <i>→</i> Standardize <i>→</i> Validate</p></div>
    <span className="architecture-arrow" aria-hidden="true">→</span>
    <ArchitectureSide label="Destinations" items={["CRM", "Business applications", "Databases", "Internal systems"]} />
  </div>;
}
function ArchitectureSide({ label, items }: { label: string; items: string[] }) { return <div className="architecture-side"><span className="architecture-label">{label}</span><div className="architecture-chips">{items.map(item => <span key={item}>{item}</span>)}</div></div>; }

export function TemplateRulesVisual() {
  const rules = ["Fields", "Column order", "Mappings", "Formats", "Allowed values", "Required values", "Transformations", "Empty-value rules"];
  return <div className="template-rules-visual"><div className="template-rules-header"><span><i /> CRM import standard</span><b>Reusable template</b></div><div className="template-rule-list">{rules.map((rule, index) => <div key={rule}><span>{String(index + 1).padStart(2, "0")}</span><strong>{rule}</strong><Check /></div>)}</div></div>;
}

export function ImportVisual() { return <VisualShell title="Event attendees.xlsx" meta="3 sheets"><div className="sheet-tabs"><span className="active">Attendees</span><span>Lookups</span><span>Summary</span></div><SpreadsheetRows headers={["First", "Surname", "Organisation"]} rows={[["Anna", "Martin", "Acme"], ["Jon", "Evans", "Northstar"]]} /><div className="detection-row"><span><Check /> 12 fields</span><span><Check /> 4 data types</span><span><Check /> 2 controlled lists</span></div></VisualShell>; }

export function MappingVisual() { const rows = [["First", "First Name"], ["Surname", "Last Name"], ["Organisation", "Company"], ["Nation", "Country"]]; return <VisualShell title="Field mapping" meta="4 of 4 mapped" className="mapping-visual"><div className="mapping-labels"><span>Source field</span><span>Destination field</span></div>{rows.map(([source, target]) => <div className="mapping-interface-row" key={source}><span>{source}</span><i>→</i><strong><Check /> {target}</strong></div>)}</VisualShell>; }

export function StandardizationVisual() { const rows = [["USA", "United States"], ["FR", "France"], ["01/09/26", "2026-09-01"], ["attendee", "Attended"]]; return <VisualShell title="Value transformations" meta="4 rules active" className="standardization-visual">{rows.map(([from, to]) => <div className="transformation-row" key={from}><code>{from}</code><span>becomes</span><strong>{to}</strong><Check /></div>)}</VisualShell>; }

export function ValidationVisual() { return <VisualShell title="Validation summary" meta="250 rows checked" className="validation-visual"><div className="validation-score"><strong>96%</strong><span>Ready to export</span></div><div className="validation-metrics"><div><b>240</b><span>Ready</span></div><div><b>7</b><span>Warnings</span></div><div><b>3</b><span>Blocked</span></div></div><ul><li><i className="error-dot" /> 3 missing required email values <b>Review</b></li><li><i className="warning-dot" /> 7 countries standardized <b>Preview</b></li><li><i className="success-dot" /> Allowed values passed <b>Passed</b></li></ul></VisualShell>; }

export function TemplateEditorVisual() { return <VisualShell title="Template editor" meta="CRM import standard" className="template-editor-visual"><div className="template-editor-head"><div><span>Template name</span><strong>Global CRM contacts</strong></div><div><span>Export format</span><strong>XLSX</strong></div></div><div className="template-columns"><span>#</span><span>Target field</span><span>Rule</span>{[["01", "First Name", "Mapped"], ["02", "Last Name", "Required"], ["03", "Country", "Allowed list"], ["04", "Lead Status", "Replacement"]].map(row => row.map(cell => <strong key={cell}>{cell}</strong>))}</div></VisualShell>; }

export function ExcelModelVisual() { return <VisualShell title="CRM-import-model.xlsx" meta="Stored workbook" className="excel-visual"><div className="excel-grid"><span className="excel-letter" />{["A", "B", "C", "D"].map(x => <span className="excel-letter" key={x}>{x}</span>)}{["1", "2", "3", "4"].map((row, i) => <div className="excel-row" key={row}><span className="excel-number">{row}</span>{[0, 1, 2, 3].map(col => <span className={i === 0 ? "excel-header-cell" : ""} key={col}>{i === 0 ? ["Name", "Email", "Country", "Status"][col] : i === 2 && col === 2 ? "France" : ""}</span>)}</div>)}</div><p className="model-note"><Check /> Workbook structure retained for export</p></VisualShell>; }

export function PreviewExportVisual() { return <VisualShell title="Final preview" meta="250 rows · 8 columns" className="preview-visual"><SpreadsheetRows clean headers={["First Name", "Email", "Country"]} rows={[["Anna Martin", "anna@acme.co", "France"], ["Jon Evans", "jon@north.io", "United States"], ["Mia Chen", "mia@contoso.com", "Singapore"]]} /><div className="export-ready"><span><Check /> All blocking checks resolved</span><button type="button">Export XLSX <span aria-hidden="true">↓</span></button></div></VisualShell>; }

export function CommonModelVisual() { return <div className="common-model-visual"><div><span>Uncontrolled source file</span><strong>Different structures<br />Inconsistent values</strong></div><i>→</i><div className="common-model-core"><span className="marketing-brand-mark">D</span><strong>DemandLint standard</strong><small>Mappings · Rules · Validation</small></div><i>→</i><div><span>Reliable destination dataset</span><strong>Predictable structure<br />Validated values</strong></div></div>; }
