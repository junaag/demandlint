import { useState } from "react";
import { cloneExportTemplate, copyExportTemplate, createExportTemplateDraft, exportTemplateId, type ExportTemplate } from "../application/exportTemplates";
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
  onSave: (template: ExportTemplate) => Promise<ExportTemplate>;
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
  sheetName: string;
  headerRowNumber: string;
}

function reviewSheet(review: ImportReview): ExportTemplateFileSheet | undefined {
  return review.analysis.sheets.find((sheet) => sheet.name === review.sheetName && sheet.usable);
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
  const [busy, setBusy] = useState<"save" | "delete" | "import" | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function createTemplate() {
    setDraft(createExportTemplateDraft({ organizationId }));
    setEditingTemplateId(null);
    setImportReview(null);
    setMessage(null);
  }

  async function importTemplateFile(file: File) {
    setBusy("import"); setMessage(null); setDraft(null); setImportReview(null);
    try {
      const analysis = await analyzeBrowserExportTemplateFile(file);
      const sheet = analysis.sheets.find((candidate) => candidate.name === analysis.selectedSheetName);
      if (!analysis.requiresSheetSelection && sheet && !sheet.requiresHeaderReview) {
        setDraft(createExportTemplateDraftFromFileAnalysis(analysis, { organizationId }));
        setEditingTemplateId(null);
      } else {
        setImportReview({
          analysis,
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
    setDraft(createExportTemplateDraftFromFileAnalysis(importReview.analysis, {
      organizationId,
      sheetName: sheet.name,
      ...(importReview.headerRowNumber ? { headerRowNumber: Number(importReview.headerRowNumber) } : {}),
    }));
    setEditingTemplateId(null);
    setImportReview(null);
    setMessage(null);
  }

  function editTemplate(template: ExportTemplate) {
    setDraft(copyTemplate(template));
    setEditingTemplateId(template.id);
    setImportReview(null);
    setMessage(null);
  }

  function duplicateTemplate(template: ExportTemplate) {
    setDraft(cloneExportTemplate(template, {
      id: exportTemplateId(), organizationId, name: `${template.name} copy`, builtIn: false,
    }));
    setEditingTemplateId(null);
    setImportReview(null);
    setMessage(null);
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
      const saved = await onSave(asNew ? cloneExportTemplate(draft, { id: exportTemplateId(), organizationId, builtIn: false }) : { ...draft, organizationId, builtIn: false });
      setDraft(copyTemplate(saved));
      setEditingTemplateId(saved.id);
      setMessage({ kind: "success", text: asNew ? "New template saved." : editingTemplateId ? "Template changes saved." : "Template saved." });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template could not be saved." });
    } finally { setBusy(null); }
  }

  return <section className="templates-page">
    <section className="hero"><p className="eyebrow">TEMPLATES</p><h1>Reusable export structures</h1><p>Create destination-ready export templates for this workspace. Runtime values are requested for each export and are never saved with the template.</p></section>
    {message && <div className={`inline-notice ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}><span>{message.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button></div>}
    <div className="templates-page-layout">
      <section className="panel templates-list-panel"><div className="section-heading"><div><p className="section-label">YOUR TEMPLATES</p><h2>{templates.length} template{templates.length === 1 ? "" : "s"}</h2></div><div className="template-heading-actions"><label className={`button ghost template-file-import${busy === "import" ? " disabled" : ""}`} aria-label="Import a template file" aria-busy={busy === "import"}><span className="template-file-import-icon" aria-hidden="true">↑</span><span>{busy === "import" ? "Analyzing…" : "Import template file"}</span><input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" disabled={busy !== null} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void importTemplateFile(file); }} /></label><button className="button primary" type="button" onClick={createTemplate} disabled={busy !== null}>Create template</button></div></div>
        {templates.length === 0 ? <div className="empty-state"><strong>No export templates yet.</strong><span>Create one manually, then use it from Prepare Export.</span></div> : <ul className="templates-list">{templates.map((template) => <li key={template.id}><div><strong>{template.name}</strong><span>{template.destinationType || "No destination label"} · {template.columns.length} columns · {template.defaultFormat.toUpperCase()}</span></div><div className="template-list-actions"><button type="button" onClick={() => editTemplate(template)}>Edit</button><button type="button" onClick={() => duplicateTemplate(template)}>Duplicate</button><button type="button" onClick={() => void renameTemplate(template)} disabled={busy !== null}>Rename</button><button className="text-danger-button" type="button" onClick={() => void deleteTemplate(template)} disabled={busy !== null}>Delete</button></div></li>)}</ul>}
      </section>
      {importReview && (() => { const sheet = reviewSheet(importReview); return <section className="panel template-import-review"><div className="section-heading"><div><p className="section-label">REVIEW IMPORT</p><h2>Create draft from file</h2><p>{importReview.analysis.fileName}</p></div><button className="text-button" type="button" onClick={() => setImportReview(null)}>Cancel</button></div><div className="template-import-review-fields">{importReview.analysis.requiresSheetSelection && <label><span>Worksheet</span><small>No lead-based worksheet selection is applied.</small><select value={importReview.sheetName} onChange={(event) => selectImportSheet(event.target.value)}><option value="">Select a worksheet</option>{importReview.analysis.sheets.map((candidate) => <option key={candidate.name} value={candidate.name} disabled={!candidate.usable}>{candidate.name}{candidate.usable ? ` · ${candidate.columnCount} columns` : " · no usable header"}</option>)}</select></label>}{sheet?.requiresHeaderReview && <label><span>Header row</span><small>Confirm which row defines the target columns.</small><select value={importReview.headerRowNumber} onChange={(event) => setImportReview({ ...importReview, headerRowNumber: event.target.value })}>{sheet.headerRows.map((row) => <option key={row.rowNumber} value={row.rowNumber}>{headerRowLabel(row.headers, row.rowNumber)}</option>)}</select></label>}<div className="template-editor-actions"><button className="button primary" type="button" disabled={!sheet || (sheet.requiresHeaderReview && !importReview.headerRowNumber)} onClick={createImportedDraft}>Create draft</button></div></div></section>; })()}
      {draft && <><section className="panel template-editor-panel"><div className="section-heading"><div><p className="section-label">{editingTemplateId ? "EDIT TEMPLATE" : "CREATE TEMPLATE"}</p><h2>{draft.name || "Untitled template"}</h2></div><button className="text-button" type="button" onClick={() => { setDraft(null); setEditingTemplateId(null); }}>Close</button></div><ExportTemplateEditor template={draft} onChange={setDraft} /><div className="template-editor-actions"><button className="button primary" type="button" disabled={busy !== null || !draft.name.trim()} onClick={() => void saveDraft()}>{busy === "save" ? "Saving…" : editingTemplateId ? "Save changes" : "Save template"}</button>{editingTemplateId && <button className="button secondary" type="button" disabled={busy !== null || !draft.name.trim()} onClick={() => void saveDraft(true)}>Save as new template</button>}</div></section><TemplateStructurePreview template={draft} /></>}
    </div>
  </section>;
}
