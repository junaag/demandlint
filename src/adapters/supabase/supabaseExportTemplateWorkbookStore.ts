import type {
  ExportTemplateWorkbook,
} from "../../application/exportTemplates";
import type {
  ExportTemplateWorkbookStore,
  StoredWorkbookUpload,
} from "../../application/exportTemplateWorkbook";
import { getSupabaseClient } from "./client";

export const EXPORT_TEMPLATE_WORKBOOK_BUCKET = "export-template-workbooks";

function objectId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function workbookPath(input: StoredWorkbookUpload): string {
  return `${input.organizationId}/${input.templateId}/${objectId()}.xlsx`;
}

export class SupabaseExportTemplateWorkbookStore implements ExportTemplateWorkbookStore {
  async save(input: StoredWorkbookUpload): Promise<ExportTemplateWorkbook> {
    const storagePath = workbookPath(input);
    const bytes = new Uint8Array(input.bytes.byteLength);
    bytes.set(input.bytes);
    const { error } = await getSupabaseClient().storage
      .from(EXPORT_TEMPLATE_WORKBOOK_BUCKET)
      .upload(storagePath, new Blob([bytes.buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }), { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", upsert: false });
    if (error) throw new Error(error.message);
    return {
      storagePath,
      originalFileName: input.originalFileName,
      originalFileType: input.originalFileType,
      storedFileType: "xlsx",
      targetSheet: input.targetSheet,
      headerRow: input.headerRow,
      firstDataRow: input.firstDataRow,
    };
  }

  async download(workbook: ExportTemplateWorkbook): Promise<Uint8Array> {
    const { data, error } = await getSupabaseClient().storage
      .from(EXPORT_TEMPLATE_WORKBOOK_BUCKET)
      .download(workbook.storagePath);
    if (error) throw new Error(error.message);
    return new Uint8Array(await data.arrayBuffer());
  }

  async delete(workbook: ExportTemplateWorkbook): Promise<void> {
    const { error } = await getSupabaseClient().storage
      .from(EXPORT_TEMPLATE_WORKBOOK_BUCKET)
      .remove([workbook.storagePath]);
    if (error) throw new Error(error.message);
  }
}

export const supabaseExportTemplateWorkbookStore = new SupabaseExportTemplateWorkbookStore();
