import type { ColumnMapping } from "../core/domain";
import {
  runtimeMappingFromSourceMapping,
  sourceMappingFromRuntime,
  type MappingTemplate,
} from "../application/mapping/contracts";
import { localMappingTemplateRepository } from "../adapters/browser/localMappingTemplateRepository";
import { isSupabaseConfigured } from "../adapters/supabase/client";
import { supabaseMappingTemplateRepository } from "../adapters/supabase/supabaseMappingTemplateRepository";

function mappingTemplateRepository() {
  return isSupabaseConfigured()
    ? supabaseMappingTemplateRepository
    : localMappingTemplateRepository;
}

function templateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function listBrowserMappingTemplates(organizationId: string): Promise<MappingTemplate[]> {
  return mappingTemplateRepository().listForOrganization(organizationId);
}

export async function saveBrowserMappingTemplate(input: {
  id?: string;
  name: string;
  organizationId: string;
  mapping: ColumnMapping;
  sourceColumns: string[];
}): Promise<MappingTemplate> {
  const name = input.name.trim();
  if (!name) throw new Error("Enter a template name.");
  const template: MappingTemplate = {
    id: input.id ?? templateId(),
    name,
    organizationId: input.organizationId,
    sourceMapping: sourceMappingFromRuntime(input.mapping),
    sourceSignature: [...input.sourceColumns],
  };
  await mappingTemplateRepository().save(template);
  return template;
}

export function deleteBrowserMappingTemplate(id: string): Promise<void> {
  return mappingTemplateRepository().delete(id);
}

export function mappingFromBrowserTemplate(template: MappingTemplate): ColumnMapping {
  return runtimeMappingFromSourceMapping(template.sourceMapping);
}
