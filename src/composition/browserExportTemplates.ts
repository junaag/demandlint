import type { ExportTemplate } from "../application/exportTemplates";
import { copyExportTemplate, normalizeExportTemplate } from "../application/exportTemplates";
import type { ExportTemplateWorkbookChange, ExportTemplateWorkbookStore } from "../application/exportTemplateWorkbook";
import type { ExportTemplateRepository } from "../application/ports/exportTemplateRepository";
import { normalizeWorkbookTemplateBytes, validateWorkbookTemplateBytes } from "../adapters/export/fillTemplateWorkbook";
import { localExportTemplateRepository } from "../adapters/browser/localExportTemplateRepository";
import { localExportTemplateWorkbookStore } from "../adapters/browser/localExportTemplateWorkbookStore";
import { isSupabaseConfigured } from "../adapters/supabase/client";
import { supabaseExportTemplateRepository } from "../adapters/supabase/supabaseExportTemplateRepository";
import { supabaseExportTemplateWorkbookStore } from "../adapters/supabase/supabaseExportTemplateWorkbookStore";

function repository() {
  return isSupabaseConfigured() ? supabaseExportTemplateRepository : localExportTemplateRepository;
}

function workbookStore(): ExportTemplateWorkbookStore {
  return isSupabaseConfigured() ? supabaseExportTemplateWorkbookStore : localExportTemplateWorkbookStore;
}

export function listBrowserExportTemplates(organizationId: string): Promise<ExportTemplate[]> {
  return repository().listForOrganization(organizationId);
}

export async function saveBrowserExportTemplate(
  template: ExportTemplate,
  organizationId: string,
  workbookChange?: ExportTemplateWorkbookChange,
): Promise<ExportTemplate> {
  return persistExportTemplateWithWorkbook(template, organizationId, workbookChange, repository(), workbookStore());
}

export async function persistExportTemplateWithWorkbook(
  template: ExportTemplate,
  organizationId: string,
  workbookChange: ExportTemplateWorkbookChange | undefined,
  targetRepository: ExportTemplateRepository,
  targetWorkbookStore: ExportTemplateWorkbookStore,
): Promise<ExportTemplate> {
  const name = template.name.trim();
  if (!name) throw new Error("Enter a template name.");
  let saved = normalizeExportTemplate(copyExportTemplate(template, {
    id: template.id,
    organizationId,
    name,
  }));
  const previousWorkbook = template.workbook;
  let uploadedWorkbook: ExportTemplate["workbook"];

  if (workbookChange?.kind === "detach") {
    const { workbook: _workbook, ...detached } = saved;
    saved = detached;
  }
  if (workbookChange?.kind === "attach") {
    const input = workbookChange.workbook;
    const bytes = await normalizeWorkbookTemplateBytes(input.bytes, input.originalFileType);
    const pendingWorkbook = {
      storagePath: "pending",
      originalFileName: input.originalFileName,
      originalFileType: input.originalFileType,
      storedFileType: "xlsx" as const,
      targetSheet: input.targetSheet,
      headerRow: input.headerRow,
      firstDataRow: input.firstDataRow,
    };
    await validateWorkbookTemplateBytes(bytes, { ...saved, workbook: pendingWorkbook });
    uploadedWorkbook = await targetWorkbookStore.save({
      ...input,
      bytes,
      organizationId,
      templateId: saved.id,
    });
    saved = { ...saved, workbook: uploadedWorkbook };
  }

  try {
    await targetRepository.save(saved);
  } catch (error) {
    if (uploadedWorkbook) await targetWorkbookStore.delete(uploadedWorkbook).catch(() => undefined);
    throw error;
  }

  if (previousWorkbook && previousWorkbook.storagePath !== saved.workbook?.storagePath) {
    await targetWorkbookStore.delete(previousWorkbook).catch(() => undefined);
  }
  return saved;
}

export async function deleteBrowserExportTemplate(id: string): Promise<void> {
  await deleteExportTemplateWithWorkbook(id, repository(), workbookStore());
}

export async function deleteExportTemplateWithWorkbook(
  id: string,
  targetRepository: ExportTemplateRepository,
  targetWorkbookStore: ExportTemplateWorkbookStore,
): Promise<void> {
  const template = await targetRepository.getById(id);
  await targetRepository.delete(id);
  if (template?.workbook) await targetWorkbookStore.delete(template.workbook).catch(() => undefined);
}

export function downloadBrowserExportTemplateWorkbook(template: ExportTemplate): Promise<Uint8Array> {
  if (!template.workbook) throw new Error("This export template does not have a stored workbook.");
  return workbookStore().download(template.workbook);
}
