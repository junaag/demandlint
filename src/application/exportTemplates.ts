import type { CanonicalField, CanonicalLead, CustomFieldValue } from "../core/domain";
import type { DataExportFormat } from "./exportFileName";

export type ExportValue = string | number | boolean | Date | null;

export type ExportColumnSource =
  | { kind: "canonical"; field: CanonicalField }
  | { kind: "custom"; key: string }
  | { kind: "parameter"; key: string; label: string; defaultValue?: string }
  | { kind: "empty" };

export type ExportValueFormat = "text" | "date" | "datetime" | "number" | "boolean";
export type ExportDatePattern = "yyyy-MM-dd" | "yyyy/MM/dd" | "MM/dd/yyyy" | "dd/MM/yyyy" | "iso-datetime";

export interface ExportValueMapping {
  from: string;
  to: string;
}

export interface ExportTemplateColumn {
  id: string;
  header: string;
  source: ExportColumnSource;
  required?: boolean;
  defaultValue?: string;
  format?: ExportValueFormat;
  datePattern?: ExportDatePattern;
  valueMappings?: ExportValueMapping[];
}

export interface ExportTemplate {
  id: string;
  organizationId?: string;
  name: string;
  destinationType: string;
  columns: ExportTemplateColumn[];
  defaultFormat: DataExportFormat;
  delimiter?: "," | ";" | "\t";
  sheetName?: string;
  builtIn?: boolean;
}

export type ExportParameterValues = Record<string, string>;

export interface ExportValidationIssue {
  columnId?: string;
  message: string;
}

export interface ExportBuildResult {
  columns: Array<{ key: string; header: string }>;
  rows: Array<Record<string, ExportValue>>;
  issues: ExportValidationIssue[];
}

export const CANONICAL_FIELD_LABELS: Record<CanonicalField, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Best email",
  emailProfessional: "Professional email",
  emailSecondary: "Secondary email",
  emailPersonal: "Personal email",
  company: "Company",
  jobTitle: "Job title",
  phone: "Best phone",
  phoneMobile: "Mobile phone",
  phoneDirect: "Direct phone",
  phoneStandard: "Switchboard phone",
  country: "Country",
  leadSource: "Lead source",
  campaignMemberStatus: "Campaign member status",
};

export const CANONICAL_FIELD_OPTIONS = Object.entries(CANONICAL_FIELD_LABELS).map(
  ([value, label]) => ({ value: value as CanonicalField, label }),
);

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

function sourceValue(
  lead: CanonicalLead,
  source: ExportColumnSource,
  parameters: ExportParameterValues,
): CustomFieldValue | undefined {
  if (source.kind === "canonical") return lead[source.field] as CustomFieldValue | undefined;
  if (source.kind === "custom") return lead.customFields?.[source.key];
  if (source.kind === "parameter") return parameters[source.key] ?? source.defaultValue;
  return "";
}

function mappedValue(value: CustomFieldValue | undefined, mappings?: ExportValueMapping[]): CustomFieldValue | undefined {
  if (!mappings || isEmpty(value)) return value;
  const match = mappings.find((mapping) => mapping.from === String(value));
  return match ? match.to : value;
}

function formatDate(date: Date, pattern: ExportDatePattern): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  if (pattern === "yyyy/MM/dd") return `${year}/${month}/${day}`;
  if (pattern === "MM/dd/yyyy") return `${month}/${day}/${year}`;
  if (pattern === "dd/MM/yyyy") return `${day}/${month}/${year}`;
  if (pattern === "iso-datetime") return date.toISOString().replace(/\.\d{3}Z$/, "Z");
  return `${year}-${month}-${day}`;
}

function formattedValue(
  value: CustomFieldValue | undefined,
  format: ExportValueFormat = "text",
  datePattern?: ExportDatePattern,
): ExportValue {
  if (isEmpty(value)) return "";
  if (format === "text") return String(value);
  if (format === "number") {
    const number = typeof value === "number" ? value : Number(String(value).replace(/\s/g, ""));
    return Number.isFinite(number) ? number : String(value);
  }
  if (format === "boolean") {
    if (typeof value === "boolean") return value;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalized)) return true;
    if (["false", "no", "n", "0"].includes(normalized)) return false;
    return String(value);
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return formatDate(date, datePattern ?? (format === "datetime" ? "iso-datetime" : "yyyy-MM-dd"));
}

export function buildTemplateExport(
  template: ExportTemplate,
  leads: readonly CanonicalLead[],
  parameters: ExportParameterValues = {},
): ExportBuildResult {
  const issues: ExportValidationIssue[] = [];
  const seenHeaders = new Set<string>();

  if (template.columns.length === 0) issues.push({ message: "Add at least one export column." });
  template.columns.forEach((item) => {
    const header = item.header.trim();
    if (!header) issues.push({ columnId: item.id, message: "Every export column needs a header." });
    const normalized = header.toLocaleLowerCase();
    if (header && seenHeaders.has(normalized)) {
      issues.push({ columnId: item.id, message: `The header '${header}' is duplicated.` });
    }
    seenHeaders.add(normalized);
    if (!["canonical", "custom", "parameter", "empty"].includes(item.source.kind)) {
      issues.push({ columnId: item.id, message: `Column '${header || "Unnamed column"}' uses an unsupported value source.` });
    }
    if (item.source.kind === "parameter" && item.required && isEmpty(parameters[item.source.key] ?? item.source.defaultValue)) {
      issues.push({ columnId: item.id, message: `Enter ${item.source.label}.` });
    }
  });

  const columns = template.columns.map((item, index) => ({
    key: `column_${index}`,
    header: item.header,
  }));
  const rows = leads.map((lead) => Object.fromEntries(template.columns.map((item, index) => {
    let value = mappedValue(sourceValue(lead, item.source, parameters), item.valueMappings);
    if (isEmpty(value) && item.defaultValue !== undefined) value = item.defaultValue;
    if (item.required && isEmpty(value)) {
      issues.push({
        columnId: item.id,
        message: `${item.header || "Unnamed column"} is empty for source row ${lead.provenance.rowNumber}.`,
      });
    }
    return [`column_${index}`, formattedValue(value, item.format, item.datePattern)];
  })));

  return { columns, rows, issues };
}

export function cloneExportTemplate(template: ExportTemplate, overrides: Partial<ExportTemplate> = {}): ExportTemplate {
  return {
    ...template,
    ...overrides,
    builtIn: overrides.builtIn ?? false,
    columns: template.columns.map((item) => ({
      ...item,
      id: templateColumnId(),
      source: { ...item.source },
      ...(item.valueMappings
        ? { valueMappings: item.valueMappings.map((mapping) => ({ ...mapping })) }
        : {}),
    })),
  };
}

export function templateColumnId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `column_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function exportTemplateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `template_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function createExportTemplateDraft(overrides: Partial<ExportTemplate> = {}): ExportTemplate {
  return {
    id: exportTemplateId(),
    name: "New export template",
    destinationType: "",
    defaultFormat: "csv",
    delimiter: ",",
    sheetName: "Export",
    columns: [{
      id: templateColumnId(),
      header: "Email",
      source: { kind: "canonical", field: "email" },
      required: true,
      format: "text",
    }],
    ...overrides,
  };
}

export function exportParameterColumns(template: ExportTemplate): ExportTemplateColumn[] {
  const seen = new Set<string>();
  return template.columns.filter((item) => {
    if (item.source.kind !== "parameter" || seen.has(item.source.key)) return false;
    seen.add(item.source.key);
    return true;
  });
}
