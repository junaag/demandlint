import { normalizeExportTemplate, type ExportTemplate } from "../../application/exportTemplates";
import type { ExportTemplateRepository } from "../../application/ports/exportTemplateRepository";
import { getSupabaseClient } from "./client";

interface ExportTemplateRow {
  id: string;
  organization_id: string;
  name: string;
  destination_type: string | null;
  config: Pick<ExportTemplate, "columns" | "defaultFormat" | "delimiter" | "sheetName">;
}

export function destinationTypeFromStorage(destinationType: string | null): string {
  return destinationType ?? "";
}

export function destinationTypeForStorage(destinationType: string): string | null {
  const normalized = destinationType.trim();
  return normalized || null;
}

function fromRow(row: ExportTemplateRow): ExportTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    destinationType: destinationTypeFromStorage(row.destination_type),
    columns: row.config.columns,
    defaultFormat: row.config.defaultFormat,
    ...(row.config.delimiter ? { delimiter: row.config.delimiter } : {}),
    ...(row.config.sheetName ? { sheetName: row.config.sheetName } : {}),
  };
}

export class SupabaseExportTemplateRepository implements ExportTemplateRepository {
  async listForOrganization(organizationId: string): Promise<ExportTemplate[]> {
    const { data, error } = await getSupabaseClient()
      .from("export_templates")
      .select("id, organization_id, name, destination_type, config")
      .eq("organization_id", organizationId)
      .order("name");
    if (error) throw new Error(error.message);
    return ((data ?? []) as ExportTemplateRow[]).map(fromRow);
  }

  async getById(id: string): Promise<ExportTemplate | null> {
    const { data, error } = await getSupabaseClient()
      .from("export_templates")
      .select("id, organization_id, name, destination_type, config")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromRow(data as ExportTemplateRow) : null;
  }

  async save(template: ExportTemplate): Promise<void> {
    if (!template.organizationId) throw new Error("An export template must belong to an organization.");
    const normalized = normalizeExportTemplate(template);
    const config = {
      columns: normalized.columns,
      defaultFormat: normalized.defaultFormat,
      delimiter: normalized.delimiter,
      sheetName: normalized.sheetName,
    };
    const { error } = await getSupabaseClient().from("export_templates").upsert({
      id: normalized.id,
      organization_id: normalized.organizationId,
      name: normalized.name,
      destination_type: destinationTypeForStorage(normalized.destinationType),
      config,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabaseClient().from("export_templates").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export const supabaseExportTemplateRepository = new SupabaseExportTemplateRepository();
