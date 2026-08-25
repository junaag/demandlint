import type { ExportTemplate } from "../application/exportTemplates";
import { copyExportTemplate, normalizeExportTemplate } from "../application/exportTemplates";
import { localExportTemplateRepository } from "../adapters/browser/localExportTemplateRepository";
import { isSupabaseConfigured } from "../adapters/supabase/client";
import { supabaseExportTemplateRepository } from "../adapters/supabase/supabaseExportTemplateRepository";

function repository() {
  return isSupabaseConfigured() ? supabaseExportTemplateRepository : localExportTemplateRepository;
}

export function listBrowserExportTemplates(organizationId: string): Promise<ExportTemplate[]> {
  return repository().listForOrganization(organizationId);
}

export async function saveBrowserExportTemplate(
  template: ExportTemplate,
  organizationId: string,
): Promise<ExportTemplate> {
  const name = template.name.trim();
  if (!name) throw new Error("Enter a template name.");
  const saved = normalizeExportTemplate(copyExportTemplate(template, {
    id: template.id,
    organizationId,
    name,
  }));
  await repository().save(saved);
  return saved;
}

export function deleteBrowserExportTemplate(id: string): Promise<void> {
  return repository().delete(id);
}
