import type { ExportTemplate } from "../application/exportTemplates";
import { cloneExportTemplate } from "../application/exportTemplates";
import { localExportTemplateRepository } from "../adapters/browser/localExportTemplateRepository";
import { isSupabaseConfigured } from "../adapters/supabase/client";
import { supabaseExportTemplateRepository } from "../adapters/supabase/supabaseExportTemplateRepository";
import { readBrowserFile } from "../adapters/browser/readBrowserFile";
import { parseTableFile } from "../adapters/table/parseTableFile";
import { suggestColumnMapping } from "../core/mapping/suggestColumnMapping";
import { templateColumnId } from "../application/exportTemplates";

function repository() {
  return isSupabaseConfigured() ? supabaseExportTemplateRepository : localExportTemplateRepository;
}

function templateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `template_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
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
  const saved = cloneExportTemplate(template, {
    id: template.builtIn ? templateId() : template.id,
    organizationId,
    name,
  });
  await repository().save(saved);
  return saved;
}

export function deleteBrowserExportTemplate(id: string): Promise<void> {
  return repository().delete(id);
}

export async function createExportTemplateFromSample(file: File): Promise<ExportTemplate> {
  const table = await parseTableFile(await readBrowserFile(file));
  const suggestions = suggestColumnMapping(table.columns);
  return {
    id: templateId(),
    name: file.name.replace(/\.[^.]+$/, "") || "Imported template",
    destinationType: "Custom destination",
    defaultFormat: table.metadata.sourceType === "xls"
      ? "xls"
      : table.metadata.sourceType === "xlsx"
        ? "xlsx"
        : table.metadata.delimiter === "\t"
          ? "tsv"
          : table.metadata.delimiter === ";"
            ? "csv-semicolon"
            : "csv",
    delimiter: table.metadata.delimiter === ";" || table.metadata.delimiter === "\t"
      ? table.metadata.delimiter
      : ",",
    sheetName: table.metadata.sheetName ?? "Export",
    columns: table.columns.map((header) => {
      const suggestion = suggestions.suggestions.find((item) => item.sourceColumn === header);
      const field = suggestion?.selectedField ?? suggestion?.candidates[0]?.field;
      return {
        id: templateColumnId(),
        header,
        source: field
          ? { kind: "canonical" as const, field }
          : { kind: "empty" as const },
        format: "text" as const,
      };
    }),
  };
}
