import { normalizeExportTemplate, type ExportTemplate } from "../../application/exportTemplates";
import type { ExportTemplateRepository } from "../../application/ports/exportTemplateRepository";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "demandlint.export-templates.v1";

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

export class LocalExportTemplateRepository implements ExportTemplateRepository {
  constructor(private readonly storage: StorageLike | undefined = browserStorage()) {}

  async listForOrganization(organizationId: string): Promise<ExportTemplate[]> {
    return this.read()
      .filter((template) => template.organizationId === organizationId)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async getById(id: string): Promise<ExportTemplate | null> {
    return this.read().find((template) => template.id === id) ?? null;
  }

  async save(template: ExportTemplate): Promise<void> {
    if (!template.organizationId) throw new Error("An export template must belong to an organization.");
    const templates = this.read();
    const index = templates.findIndex((candidate) => candidate.id === template.id);
    const normalized = normalizeExportTemplate(template);
    if (index >= 0) templates[index] = normalized;
    else templates.push(normalized);
    this.write(templates);
  }

  async delete(id: string): Promise<void> {
    this.write(this.read().filter((template) => template.id !== id));
  }

  private read(): ExportTemplate[] {
    if (!this.storage) return [];
    try {
      const parsed = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? "[]");
      // Keep an unsaved legacy fixed value available for a one-time export. It
      // is normalized and removed only when the template is explicitly saved.
      return Array.isArray(parsed) ? parsed as ExportTemplate[] : [];
    } catch {
      return [];
    }
  }

  private write(templates: ExportTemplate[]): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch {
      // Templates remain usable for the current export when storage is unavailable.
    }
  }
}

export const localExportTemplateRepository = new LocalExportTemplateRepository();
