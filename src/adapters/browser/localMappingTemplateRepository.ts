import type { MappingTemplate } from "../../application/mapping/contracts";
import type { MappingTemplateRepository } from "../../application/ports/mappingTemplateRepository";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "demandlint.mapping-templates.v1";

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

export class LocalMappingTemplateRepository implements MappingTemplateRepository {
  constructor(private readonly storage: StorageLike | undefined = browserStorage()) {}

  async listForOrganization(organizationId: string): Promise<MappingTemplate[]> {
    return this.read()
      .filter((template) => template.organizationId === organizationId)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async getById(id: string): Promise<MappingTemplate | null> {
    return this.read().find((template) => template.id === id) ?? null;
  }

  async save(template: MappingTemplate): Promise<void> {
    if (!template.organizationId) throw new Error("A mapping template must belong to an organization.");
    const templates = this.read();
    const index = templates.findIndex((candidate) => candidate.id === template.id);
    if (index >= 0) templates[index] = template;
    else templates.push(template);
    this.write(templates);
  }

  async delete(id: string): Promise<void> {
    this.write(this.read().filter((template) => template.id !== id));
  }

  private read(): MappingTemplate[] {
    if (!this.storage) return [];
    try {
      const value = this.storage.getItem(STORAGE_KEY);
      if (!value) return [];
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as MappingTemplate[] : [];
    } catch {
      return [];
    }
  }

  private write(templates: MappingTemplate[]): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch {
      // Saving templates is optional when browser storage is unavailable.
    }
  }
}

export const localMappingTemplateRepository = new LocalMappingTemplateRepository();
