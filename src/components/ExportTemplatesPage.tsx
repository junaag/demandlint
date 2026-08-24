import { useState } from "react";
import { cloneExportTemplate, createExportTemplateDraft, exportTemplateId, type ExportTemplate } from "../application/exportTemplates";
import { ExportTemplateEditor } from "./ExportTemplateEditor";

interface ExportTemplatesPageProps {
  templates: ExportTemplate[];
  organizationId: string;
  onSave: (template: ExportTemplate) => Promise<ExportTemplate>;
  onDelete: (id: string) => Promise<void>;
}

function copyTemplate(template: ExportTemplate): ExportTemplate {
  return cloneExportTemplate(template, {
    id: template.id,
    ...(template.organizationId ? { organizationId: template.organizationId } : {}),
    builtIn: false,
  });
}

function previewSourceLabel(template: ExportTemplate["columns"][number]): string {
  return template.source.kind === "canonical" ? "Default field"
    : template.source.kind === "custom" ? "Custom field"
      : template.source.kind === "parameter" ? "Fixed value"
        : "Leave empty";
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
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function createTemplate() {
    setDraft(createExportTemplateDraft({ organizationId }));
    setMessage(null);
  }

  function editTemplate(template: ExportTemplate) {
    setDraft(copyTemplate(template));
    setMessage(null);
  }

  function duplicateTemplate(template: ExportTemplate) {
    setDraft(cloneExportTemplate(template, {
      id: exportTemplateId(), organizationId, name: `${template.name} copy`, builtIn: false,
    }));
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
      if (draft?.id === template.id) setDraft(null);
      setMessage({ kind: "success", text: "Template deleted." });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template could not be deleted." });
    } finally { setBusy(null); }
  }

  async function saveDraft() {
    if (!draft) return;
    setBusy("save"); setMessage(null);
    try {
      const saved = await onSave({ ...draft, organizationId, builtIn: false });
      setDraft(copyTemplate(saved));
      setMessage({ kind: "success", text: "Template saved." });
    } catch (caught) {
      setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The template could not be saved." });
    } finally { setBusy(null); }
  }

  return <section className="templates-page">
    <section className="hero"><p className="eyebrow">TEMPLATES</p><h1>Reusable export structures</h1><p>Create destination-ready export templates for this workspace. Runtime values are requested for each export and are never saved with the template.</p></section>
    {message && <div className={`inline-notice ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}><span>{message.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button></div>}
    <div className="templates-page-layout">
      <section className="panel templates-list-panel"><div className="section-heading"><div><p className="section-label">YOUR TEMPLATES</p><h2>{templates.length} template{templates.length === 1 ? "" : "s"}</h2></div><button className="button primary" type="button" onClick={createTemplate}>Create template</button></div>
        {templates.length === 0 ? <div className="empty-state"><strong>No export templates yet.</strong><span>Create one manually, then use it from Prepare Export.</span></div> : <ul className="templates-list">{templates.map((template) => <li key={template.id}><div><strong>{template.name}</strong><span>{template.destinationType || "No destination label"} · {template.columns.length} columns · {template.defaultFormat.toUpperCase()}</span></div><div className="template-list-actions"><button type="button" onClick={() => editTemplate(template)}>Edit</button><button type="button" onClick={() => duplicateTemplate(template)}>Duplicate</button><button type="button" onClick={() => void renameTemplate(template)} disabled={busy !== null}>Rename</button><button className="text-danger-button" type="button" onClick={() => void deleteTemplate(template)} disabled={busy !== null}>Delete</button></div></li>)}</ul>}
      </section>
      {draft && <><section className="panel template-editor-panel"><div className="section-heading"><div><p className="section-label">{templates.some((template) => template.id === draft.id) ? "EDIT TEMPLATE" : "CREATE TEMPLATE"}</p><h2>{draft.name || "Untitled template"}</h2></div><button className="text-button" type="button" onClick={() => setDraft(null)}>Close</button></div><ExportTemplateEditor template={draft} onChange={setDraft} /><div className="template-editor-actions"><button className="button primary" type="button" disabled={busy !== null || !draft.name.trim()} onClick={() => void saveDraft()}>{busy === "save" ? "Saving…" : "Save template"}</button></div></section><TemplateStructurePreview template={draft} /></>}
    </div>
  </section>;
}
