import type { ExportTemplate } from "../../application/exportTemplates";
import type { ExportTemplateRepository } from "../../application/ports/exportTemplateRepository";
import { getSupabaseClient } from "./client";

interface ExportTemplateRow {
  id: string;
  organization_id: string;
  name: string;
  destination_type: string;
  config: Pick<ExportTemplate, "columns" | "defaultFormat" | "delimiter" | "sheetName">;
}

function fromRow(row: ExportTemplateRow): ExportTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    destinationType: row.destination_type,
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
    const config = {
      columns: template.columns,
      defaultFormat: template.defaultFormat,
      delimiter: template.delimiter,
      sheetName: template.sheetName,
    };
    const { error } = await getSupabaseClient().from("export_templates").upsert({
      id: template.id,
      organization_id: template.organizationId,
      name: template.name,
      destination_type: template.destinationType,
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
