import { useState, type FormEvent } from "react";
import type { MappingTemplate } from "../application/public";

interface MappingTemplatesPanelProps {
  templates: MappingTemplate[];
  currentColumns: string[];
  onSave: (name: string) => Promise<void>;
  onApply: (template: MappingTemplate) => void;
  onDelete: (id: string) => Promise<void>;
}

function exactMatch(template: MappingTemplate, columns: string[]): boolean {
  return JSON.stringify(template.sourceSignature ?? []) === JSON.stringify(columns);
}

export function MappingTemplatesPanel({
  templates,
  currentColumns,
  onSave,
  onApply,
  onDelete,
}: MappingTemplatesPanelProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(name);
      setName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The template could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await onDelete(id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The template could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel templates-panel">
      <div className="section-heading compact-heading">
        <div>
          <p className="section-label">SAVED MAPPINGS</p>
          <h2>Reuse this source mapping</h2>
          <p>Templates belong to the active organization and never contain lead data.</p>
        </div>
        <form className="template-save" onSubmit={(event) => void save(event)}>
          <input
            aria-label="Mapping template name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Cvent France"
          />
          <button className="button ghost" type="submit" disabled={busy || !name.trim()}>
            Save current mapping
          </button>
        </form>
      </div>

      {error && <div className="inline-error" role="alert">{error}</div>}

      {templates.length > 0 ? (
        <div className="template-list">
          {templates.map((template) => {
            const matches = exactMatch(template, currentColumns);
            return (
              <article className="template-item" key={template.id}>
                <div>
                  <strong>{template.name}</strong>
                  <span className={matches ? "match-badge exact" : "match-badge partial"}>
                    {matches ? "Exact column match" : "Different columns"}
                  </span>
                </div>
                <div className="template-actions">
                  <button className="button ghost" type="button" onClick={() => onApply(template)}>
                    Apply
                  </button>
                  <button
                    className="icon-button danger"
                    type="button"
                    aria-label={`Delete ${template.name}`}
                    disabled={busy}
                    onClick={() => void remove(template.id)}
                  >×</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-state">No saved mappings in this organization yet.</p>
      )}
    </section>
  );
}
