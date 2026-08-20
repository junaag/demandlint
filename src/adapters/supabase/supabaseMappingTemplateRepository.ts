import type { MappingTemplate } from "../../application/mapping/contracts";
import type { MappingTemplateRepository } from "../../application/ports/mappingTemplateRepository";
import { getSupabaseClient } from "./client";

interface MappingTemplateRow {
  id: string;
  organization_id: string;
  name: string;
  source_mapping: MappingTemplate["sourceMapping"];
  destination_mapping: MappingTemplate["destinationMapping"] | null;
  source_signature: string[] | null;
}

function fromRow(row: MappingTemplateRow): MappingTemplate {
  return {
    id: row.id,
    name: row.name,
    organizationId: row.organization_id,
    sourceMapping: row.source_mapping,
    ...(row.destination_mapping ? { destinationMapping: row.destination_mapping } : {}),
    ...(row.source_signature ? { sourceSignature: row.source_signature } : {}),
  };
}

export class SupabaseMappingTemplateRepository implements MappingTemplateRepository {
  async listForOrganization(organizationId: string): Promise<MappingTemplate[]> {
    const { data, error } = await getSupabaseClient()
      .from("mapping_templates")
      .select("id, organization_id, name, source_mapping, destination_mapping, source_signature")
      .eq("organization_id", organizationId)
      .order("name");
    if (error) throw new Error(error.message);
    return ((data ?? []) as MappingTemplateRow[]).map(fromRow);
  }

  async getById(id: string): Promise<MappingTemplate | null> {
    const { data, error } = await getSupabaseClient()
      .from("mapping_templates")
      .select("id, organization_id, name, source_mapping, destination_mapping, source_signature")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromRow(data as MappingTemplateRow) : null;
  }

  async save(template: MappingTemplate): Promise<void> {
    if (!template.organizationId) throw new Error("A mapping template must belong to an organization.");
    const { error } = await getSupabaseClient().from("mapping_templates").upsert({
      id: template.id,
      organization_id: template.organizationId,
      name: template.name,
      source_mapping: template.sourceMapping,
      destination_mapping: template.destinationMapping ?? null,
      source_signature: template.sourceSignature ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabaseClient().from("mapping_templates").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export const supabaseMappingTemplateRepository = new SupabaseMappingTemplateRepository();
