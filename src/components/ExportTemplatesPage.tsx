import { useState } from "react";
import { cloneExportTemplate, copyExportTemplate, createExportTemplateDraft, exportTemplateId, type ExportTemplate } from "../application/exportTemplates";
import { workbookHeaderCompatibility, type ExportTemplateWorkbookChange } from "../application/exportTemplateWorkbook";
import {
  createExportTemplateDraftFromFileAnalysis,
  type ExportTemplateFileAnalysis,
  type ExportTemplateFileSheet,
} from "../application/exportTemplateFileImport";
import { analyzeBrowserExportTemplateFile } from "../composition/browserExportTemplateFileImport";
import { ExportTemplateEditor } from "./ExportTemplateEditor";

interface ExportTemplatesPageProps {
  templates: ExportTemplate[];
  organizationId: string;
  onSave: (template: ExportTemplate, workbookChange?: ExportTemplateWorkbookChange) => Promise<ExportTemplate>;
  onDelete: (id: string) => Promise<void>;
}

function copyTemplate(template: ExportTemplate): ExportTemplate {
  return copyExportTemplate(template, {
    id: template.id,
    ...(template.organizationId ? { organizationId: template.organizationId } : {}),
    builtIn: false,
  });
}

function previewSourceLabel(template: ExportTemplate["columns"][number]): string {
  return template.source.kind === "canonical" || template.source.kind === "custom" ? "Mapped field"
    : template.source.kind === "fixed" || template.source.kind === "parameter" ? "Fixed field"
        : "Leave empty";
}

interface ImportReview {
  analysis: ExportTemplateFileAnalysis;
  bytes: Uint8Array;
  sheetName: string;
  headerRowNumber: string;
}

interface WorkbookCandidate {
  analysis: ExportTemplateFileAnalysis;
  bytes: Uint8Array;
  sheetName: string;
  headerRowNumber: number;
  firstDataRow: number;
  keep: boolean;
  replacement: boolean;
}

function reviewSheet(review: ImportReview): ExportTemplateFileSheet | undefined {
  return review.analysis.sheets.find((sheet) => sheet.name === review.sheetName && sheet.usable);
}

function candidateSheet(candidate: WorkbookCandidate): ExportTemplateFileSheet | undefined {
  return candidate.analysis.sheets.find((sheet) => sheet.name === candidate.sheetName && sheet.usable);
}

function candidateHeaders(candidate: WorkbookCandidate): string[] {
  return candidateSheet(candidate)?.headerRows.find((row) => row.rowNumber === candidate.headerRowNumber)?.headers ?? [];
}

function workbookCandidate(
  analysis: ExportTemplateFileAnalysis,
  bytes: Uint8Array,
  sheetName: string,
  headerRowNumber: number,
  replacement: boolean,
): WorkbookCandidate {
  return { analysis, bytes, sheetName, headerRowNumber, firstDataRow: headerRowNumber + 1, keep: replacement, replacement };
}

function headerRowLabel(headers: string[], rowNumber: number): string {
  const preview = headers.map((header, index) => header.trim() || `Column ${index + 1}`).slice(0, 4).join(" · ");
  return `Row ${rowNumber}: ${preview}${headers.length > 4 ? " · …" : ""}`;
}

export function TemplateStructurePreview({ template }: { template: ExportTemplate }) {
  return <section className="panel template-structure-preview">
    <p className="section-label">OUTPUT STRUCTURE PREVIEW</p>
    <h2>Output structure preview</h2>
    <p>This is the structure of the exported file, not a data preview.</p>
    <div className="export-preview-table-wrap template-structure-preview-table"><table className="export-preview-table"><thead><tr>{template.columns.map((column) => <th key={column.id}>{column.header || "(blank column)"}</th>)}</tr></thead><tbody><tr>{template.columns.map((column) => <td key={column.id}>{previewSourceLabel(column)}</td>)}</tr></tbody></table></div>
    <span className="template-column-count">{template.columns.length} column{template.columns.length === 1 ? "" : "s"}</span>
  </section>;
}

export function ExportTemplatesPage({ templates, organizationId, onSave, onDelete }: ExportTemplatesPageProps) {
  const [draft, setDraft] = useState<ExportTemplate | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [importReview, setImportReview] = useState<ImportReview | null>(null);
  const [workbookCandidateState, setWorkbookCandidateState] = useState<WorkbookCandidate | null>(null);
  const [detachWorkbook, setDetachWorkbook] = useState(false);
  const [busy, setBusy] = useState<"save" | "delete" | "import" | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function createTemplate() {
    setDraft(createExportTemplateDraft({ organizationId }));
    setEditingTemplateId(null);
    setImportReview(null);
    setWorkbookCandidateState(null);
    setDetachWorkbook(false);
    setMessage(null);
  }

  async function importTemplateFile(file: File) {
    setBusy("import"); setMessage(null); setDraft(null); setImportReview(null); setWorkbookCandidateState(null); setDetachWorkbook(false);
    try {
      const [analysis, buffer] = await Promise.all([analyzeBrowserExportTemplateFile(file), file.arrayBuffer()]);
      const bytes = new Uint8Array(buffer);
      const sheet = analysis.sheets.find((candidate) => candidate.name === analysis.selectedSheetName);
      if (!analysis.requiresSheetSelection && sheet && !sheet.requiresHeaderReview) {
        setDraft(createExportTemplateDraftFromFileAnalysis(analysis, { organizationId }));
        setEditingTemplateId(null);
        if (analysis.sourceType !== "csv" && sheet.preferredHeaderRowNumber) {
          setWorkbookCandidateState(workbookCandidate(analysis, bytes, sheet.name, sheet.preferredHeaderRowNumber, false));
        } else setWorkbookCandidateState(null);
      } else {
        setImportReview({
          analysis,
          bytes,
          sheetName: analysis.selectedSheetName ?? "",
          headerRowNumber: sheet?.requiresHeaderReview ? String(sheet.preferredHeaderRowNumber ?? "") : "",
        });
      }
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template file could not be analyzed." });
    } finally { setBusy(null); }
  }

  function selectImportSheet(sheetName: string) {
    setImportReview((current) => {
      if (!current) return current;
      const sheet = current.analysis.sheets.find((candidate) => candidate.name === sheetName && candidate.usable);
      return {
        ...current,
        sheetName,
        headerRowNumber: sheet?.requiresHeaderReview ? String(sheet.preferredHeaderRowNumber ?? "") : "",
      };
    });
  }

  function createImportedDraft() {
    if (!importReview) return;
    const sheet = reviewSheet(importReview);
    if (!sheet) return;
    const headerRowNumber = importReview.headerRowNumber ? Number(importReview.headerRowNumber) : sheet.preferredHeaderRowNumber;
    setDraft(createExportTemplateDraftFromFileAnalysis(importReview.analysis, {
      organizationId,
      sheetName: sheet.name,
      ...(headerRowNumber ? { headerRowNumber } : {}),
    }));
    if (importReview.analysis.sourceType !== "csv" && headerRowNumber) {
      setWorkbookCandidateState(workbookCandidate(importReview.analysis, importReview.bytes, sheet.name, headerRowNumber, false));
    } else setWorkbookCandidateState(null);
    setDetachWorkbook(false);
    setEditingTemplateId(null);
    setImportReview(null);
    setMessage(null);
  }

  function editTemplate(template: ExportTemplate) {
    setDraft(copyTemplate(template));
    setEditingTemplateId(template.id);
    setImportReview(null);
    setWorkbookCandidateState(null);
    setDetachWorkbook(false);
    setMessage(null);
  }

  function duplicateTemplate(template: ExportTemplate) {
    setDraft(cloneExportTemplate(template, {
      id: exportTemplateId(), organizationId, name: `${template.name} copy`, builtIn: false,
    }));
    setEditingTemplateId(null);
    setImportReview(null);
    setWorkbookCandidateState(null);
    setDetachWorkbook(false);
    setMessage(null);
  }

  async function selectWorkbookFile(file: File) {
    setBusy("import"); setMessage(null);
    try {
      const [analysis, buffer] = await Promise.all([analyzeBrowserExportTemplateFile(file), file.arrayBuffer()]);
      if (analysis.sourceType === "csv") throw new Error("Choose an XLSX or XLS workbook.");
      const preferredName = draft?.workbook?.targetSheet;
      const sheet = analysis.sheets.find((candidate) => candidate.usable && candidate.name === preferredName)
        ?? analysis.sheets.find((candidate) => candidate.usable && candidate.name === analysis.selectedSheetName)
        ?? analysis.sheets.find((candidate) => candidate.usable);
      if (!sheet?.preferredHeaderRowNumber) throw new Error("The workbook does not contain a usable header row.");
      setWorkbookCandidateState(workbookCandidate(
        analysis,
        new Uint8Array(buffer),
        sheet.name,
        sheet.preferredHeaderRowNumber,
        Boolean(draft?.workbook),
      ));
      setDetachWorkbook(false);
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The workbook could not be analyzed." });
    } finally { setBusy(null); }
  }

  function selectCandidateSheet(sheetName: string) {
    setWorkbookCandidateState((current) => {
      if (!current) return current;
      const sheet = current.analysis.sheets.find((candidate) => candidate.usable && candidate.name === sheetName);
      const headerRowNumber = sheet?.preferredHeaderRowNumber ?? 1;
      return { ...current, sheetName, headerRowNumber, firstDataRow: headerRowNumber + 1 };
    });
  }

  function workbookSection() {
    if (!draft) return null;
    const candidate = workbookCandidateState;
    const sheet = candidate ? candidateSheet(candidate) : undefined;
    const compatibilityIssues = candidate?.keep ? workbookHeaderCompatibility(draft, candidateHeaders(candidate)) : [];
    const attached = draft.workbook && !detachWorkbook;
    return <section className="workbook-template-section" aria-labelledby="workbook-template-title">
      <div className="workbook-template-heading"><div><p className="section-label">{candidate && !candidate.replacement ? "SOURCE WORKBOOK" : "WORKBOOK TEMPLATE"}</p><h3 id="workbook-template-title">{candidate && !candidate.replacement ? candidate.analysis.fileName : "Workbook template"}</h3></div>
        <label className="button ghost workbook-file-action"><span>{attached || candidate ? "Replace workbook" : "Attach workbook"}</span><input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" disabled={busy !== null} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void selectWorkbookFile(file); }} /></label>
      </div>
      {attached && <div className="attached-workbook-summary"><div><strong>{draft.workbook!.originalFileName}</strong><span>{draft.workbook!.targetSheet} · header row {draft.workbook!.headerRow} · data starts row {draft.workbook!.firstDataRow}</span>{draft.workbook!.originalFileType === "xls" && <small>Stored as XLSX for reliable template filling.</small>}</div><button className="text-danger-button" type="button" onClick={() => { setDetachWorkbook(true); setWorkbookCandidateState(null); }}>Detach</button></div>}
      {detachWorkbook && <div className="inline-notice"><span>The workbook will be detached when you save this template.</span><button type="button" onClick={() => setDetachWorkbook(false)}>Undo</button></div>}
      {candidate && <div className="workbook-candidate">
        <label className="workbook-keep-toggle"><span><strong>{candidate.replacement ? "Use replacement workbook" : "Keep workbook for future exports"}</strong><small>The workbook is stored only when this template is saved.</small></span><input type="checkbox" checked={candidate.keep} onChange={(event) => setWorkbookCandidateState({ ...candidate, keep: event.target.checked })} /></label>
        {candidate.keep && <><div className="workbook-coordinate-grid">
          <label><span>Target worksheet</span><select value={candidate.sheetName} onChange={(event) => selectCandidateSheet(event.target.value)}>{candidate.analysis.sheets.filter((item) => item.usable).map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
          <label><span>Header row</span><select value={candidate.headerRowNumber} onChange={(event) => { const headerRowNumber = Number(event.target.value); setWorkbookCandidateState({ ...candidate, headerRowNumber, firstDataRow: Math.max(candidate.firstDataRow, headerRowNumber + 1) }); }}>{sheet?.headerRows.map((row) => <option key={row.rowNumber} value={row.rowNumber}>{headerRowLabel(row.headers, row.rowNumber)}</option>)}</select></label>
          <label><span>First data row</span><input type="number" min={candidate.headerRowNumber + 1} value={candidate.firstDataRow} onChange={(event) => setWorkbookCandidateState({ ...candidate, firstDataRow: Number(event.target.value) })} /></label>
        </div>{candidate.analysis.sourceType === "xls" && <p className="validation-warning">Legacy XLS will be normalized to XLSX. Existing XLS import remains available, but old binary workbook features may not round-trip exactly.</p>}{compatibilityIssues.length > 0 ? <div className="inline-notice error" role="alert"><span>{compatibilityIssues.join(" ")} Existing mappings have not been changed.</span></div> : <div className="inline-notice success"><span>Workbook columns are compatible with the current mapping.</span></div>}</>}
        {candidate.replacement && <button className="text-button" type="button" onClick={() => setWorkbookCandidateState(null)}>Cancel replacement</button>}
      </div>}
      {!attached && !candidate && !detachWorkbook && <p className="workbook-empty-state">Attach an XLSX or XLS workbook to make “Fill template workbook” available in Prepare Export.</p>}
    </section>;
  }

  async function renameTemplate(template: ExportTemplate) {
    const name = window.prompt("Template name", template.name)?.trim();
    if (!name || name === template.name) return;
    setBusy("save"); setMessage(null);
    try {
      const saved = await onSave({ ...template, name, organizationId });
      if (draft?.id === saved.id) setDraft(copyTemplate(saved));
      setMessage({ kind: "success", text: "Template renamed." });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template could not be renamed." });
    } finally { setBusy(null); }
  }

  async function deleteTemplate(template: ExportTemplate) {
    if (!window.confirm(`Delete '${template.name}'? This cannot be undone.`)) return;
    setBusy("delete"); setMessage(null);
    try {
      await onDelete(template.id);
      if (draft?.id === template.id) { setDraft(null); setEditingTemplateId(null); }
      setMessage({ kind: "success", text: "Template deleted." });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template could not be deleted." });
    } finally { setBusy(null); }
  }

  async function saveDraft(asNew = false) {
    if (!draft) return;
    setBusy("save"); setMessage(null);
    try {
      const compatibilityIssues = workbookCandidateState?.keep
        ? workbookHeaderCompatibility(draft, candidateHeaders(workbookCandidateState))
        : [];
      if (compatibilityIssues.length > 0) throw new Error(compatibilityIssues.join(" "));
      const workbookChange: ExportTemplateWorkbookChange | undefined = workbookCandidateState?.keep
        ? {
            kind: "attach",
            workbook: {
              bytes: workbookCandidateState.bytes,
              originalFileName: workbookCandidateState.analysis.fileName,
              originalFileType: workbookCandidateState.analysis.sourceType as "xlsx" | "xls",
              targetSheet: workbookCandidateState.sheetName,
              headerRow: workbookCandidateState.headerRowNumber,
              firstDataRow: workbookCandidateState.firstDataRow,
            },
          }
        : !asNew && detachWorkbook ? { kind: "detach" } : undefined;
      const nextTemplate = asNew
        ? cloneExportTemplate(draft, { id: exportTemplateId(), organizationId, builtIn: false })
        : { ...draft, organizationId, builtIn: false };
      const saved = await onSave(nextTemplate, workbookChange);
      setDraft(copyTemplate(saved));
      setEditingTemplateId(saved.id);
      setWorkbookCandidateState(null);
      setDetachWorkbook(false);
      setMessage({ kind: "success", text: asNew ? "New template saved." : editingTemplateId ? "Template changes saved." : "Template saved." });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template could not be saved." });
    } finally { setBusy(null); }
  }

  const workbookSaveBlocked = Boolean(draft && workbookCandidateState?.keep
    && workbookHeaderCompatibility(draft, candidateHeaders(workbookCandidateState)).length > 0);

  return <section className="templates-page">
    <section className="hero"><p className="eyebrow">TEMPLATES</p><h1>Reusable export structures</h1><p>Create destination-ready export templates for this workspace. Runtime values are requested for each export and are never saved with the template.</p></section>
    {message && <div className={`inline-notice ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}><span>{message.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button></div>}
    <div className="templates-page-layout">
      <section className="panel templates-list-panel"><div className="section-heading"><div><p className="section-label">YOUR TEMPLATES</p><h2>{templates.length} template{templates.length === 1 ? "" : "s"}</h2></div><div className="template-heading-actions"><label className={`button ghost template-file-import${busy === "import" ? " disabled" : ""}`} aria-label="Import a template file" aria-busy={busy === "import"}><span className="template-file-import-icon" aria-hidden="true">↑</span><span>{busy === "import" ? "Analyzing…" : "Import template file"}</span><input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" disabled={busy !== null} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void importTemplateFile(file); }} /></label><button className="button primary" type="button" onClick={createTemplate} disabled={busy !== null}>Create template</button></div></div>
        {templates.length === 0 ? <div className="empty-state"><strong>No export templates yet.</strong><span>Create one manually, then use it from Prepare Export.</span></div> : <ul className="templates-list">{templates.map((template) => <li key={template.id}><div><strong>{template.name}</strong><span>{template.destinationType || "No destination label"} · {template.columns.length} columns · {template.defaultFormat.toUpperCase()}</span></div><div className="template-list-actions"><button type="button" onClick={() => editTemplate(template)}>Edit</button><button type="button" onClick={() => duplicateTemplate(template)}>Duplicate</button><button type="button" onClick={() => void renameTemplate(template)} disabled={busy !== null}>Rename</button><button className="text-danger-button" type="button" onClick={() => void deleteTemplate(template)} disabled={busy !== null}>Delete</button></div></li>)}</ul>}
      </section>
      {importReview && (() => { const sheet = reviewSheet(importReview); return <section className="panel template-import-review"><div className="section-heading"><div><p className="section-label">REVIEW IMPORT</p><h2>Create draft from file</h2><p>{importReview.analysis.fileName}</p></div><button className="text-button" type="button" onClick={() => setImportReview(null)}>Cancel</button></div><div className="template-import-review-fields">{importReview.analysis.requiresSheetSelection && <label><span>Worksheet</span><small>No lead-based worksheet selection is applied.</small><select value={importReview.sheetName} onChange={(event) => selectImportSheet(event.target.value)}><option value="">Select a worksheet</option>{importReview.analysis.sheets.map((candidate) => <option key={candidate.name} value={candidate.name} disabled={!candidate.usable}>{candidate.name}{candidate.usable ? ` · ${candidate.columnCount} columns` : " · no usable header"}</option>)}</select></label>}{sheet?.requiresHeaderReview && <label><span>Header row</span><small>Confirm which row defines the target columns.</small><select value={importReview.headerRowNumber} onChange={(event) => setImportReview({ ...importReview, headerRowNumber: event.target.value })}>{sheet.headerRows.map((row) => <option key={row.rowNumber} value={row.rowNumber}>{headerRowLabel(row.headers, row.rowNumber)}</option>)}</select></label>}<div className="template-editor-actions"><button className="button primary" type="button" disabled={!sheet || (sheet.requiresHeaderReview && !importReview.headerRowNumber)} onClick={createImportedDraft}>Create draft</button></div></div></section>; })()}
      {draft && <>
        <section className="panel template-editor-panel">
          <div className="section-heading"><div><p className="section-label">{editingTemplateId ? "EDIT TEMPLATE" : "CREATE TEMPLATE"}</p><h2>{draft.name || "Untitled template"}</h2></div><button className="text-button" type="button" onClick={() => { setDraft(null); setEditingTemplateId(null); setWorkbookCandidateState(null); setDetachWorkbook(false); }}>Close</button></div>
          <ExportTemplateEditor template={draft} onChange={setDraft} workbookSection={workbookSection()} />
          <div className="template-editor-actions"><button className="button primary" type="button" disabled={busy !== null || !draft.name.trim() || workbookSaveBlocked} onClick={() => void saveDraft()}>{busy === "save" ? "Saving…" : editingTemplateId ? "Save changes" : "Save template"}</button>{editingTemplateId && <button className="button secondary" type="button" disabled={busy !== null || !draft.name.trim() || workbookSaveBlocked} onClick={() => void saveDraft(true)}>Save as new template</button>}</div>
        </section>
        <TemplateStructurePreview template={draft} />
      </>}
    </div>
  </section>;
}
