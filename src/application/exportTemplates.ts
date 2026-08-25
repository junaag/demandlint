import type { CanonicalField, CanonicalLead, CustomFieldValue } from "../core/domain";
import type { DataExportFormat } from "./exportFileName";

export type ExportValue = string | number | boolean | Date | null;

export type ExportColumnSource =
  | { kind: "canonical"; field: CanonicalField }
  | { kind: "custom"; key: string }
  | { kind: "fixed"; value: string }
  // Retained only to deserialize v0.3.7 templates. New templates use fixed values.
  | { kind: "parameter"; key: string; label: string; defaultValue?: string }
  | { kind: "empty" };

export type ExportValueFormat = "text" | "date" | "datetime" | "number" | "boolean";
export type ExportDatePattern = "yyyy-MM-dd" | "yyyy/MM/dd" | "MM/dd/yyyy" | "dd/MM/yyyy" | "iso-datetime";

export interface ExportValueMapping {
  from: string;
  to: string;
}

export type ExportValidationOutcome = "block" | "review";
export type ExportRequiredWhenOperator = "is" | "isNot" | "isOneOf" | "isNotOneOf";
export type ExportSimpleValidationKind =
  | "email" | "url" | "digitsOnly" | "noDigits" | "noSpaces"
  | "contains" | "doesNotContain" | "startsWith" | "endsWith";

export type ExportValidationRule =
  | { kind: "required"; outcome: ExportValidationOutcome }
  | { kind: "requiredWhen"; outcome: ExportValidationOutcome; parentColumnId: string; operator: ExportRequiredWhenOperator; values: string[] }
  | { kind: "allowedValues"; outcome: ExportValidationOutcome; values: string[] }
  | { kind: "dependentAllowedValues"; outcome: ExportValidationOutcome; parentColumnId: string; cases: Record<string, string[]> }
  | { kind: "simple"; outcome: ExportValidationOutcome; validation: ExportSimpleValidationKind; value?: string };

export interface ExportTemplateColumn {
  id: string;
  header: string;
  source: ExportColumnSource;
  /** v0.3.8 normalized validation rules. `required` below is read as a legacy rule. */
  validationRules?: ExportValidationRule[];
  /** Structured source rules that were detected but could not safely be normalized. */
  sourceValidationWarnings?: string[];
  /** v0.3.7 compatibility only; use a `required` validation rule for new templates. */
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
  outcome?: ExportValidationOutcome;
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
  stateProvince: "State / province",
  city: "City",
  postalCode: "Postal code",
  address: "Address",
  salutation: "Salutation",
  jobLevel: "Job level",
  department: "Department",
  localCompanyName: "Local company name",
  website: "Website",
  industry: "Industry",
  leadSource: "Lead source",
  campaignId: "Campaign ID",
  campaignName: "Campaign name",
  campaignMemberStatus: "Campaign member status",
  utmSource: "UTM source",
  utmMedium: "UTM medium",
  utmCampaign: "UTM campaign",
  utmContent: "UTM content",
  initialResponseDate: "Initial response date",
  marketingConsent: "Marketing consent",
  salesFollowUpRequested: "Sales follow-up requested",
  contactNotes: "Contact notes",
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
  if (source.kind === "fixed") return source.value;
  if (source.kind === "parameter") return parameters[source.key] ?? source.defaultValue;
  return "";
}

function rulesFor(column: ExportTemplateColumn): ExportValidationRule[] {
  const rules = column.validationRules ?? [];
  return column.required && !rules.some((rule) => rule.kind === "required")
    ? [{ kind: "required", outcome: "block" }, ...rules]
    : rules;
}

function displayValue(value: ExportValue | undefined): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function conditionMatches(value: string, operator: ExportRequiredWhenOperator, expected: readonly string[]): boolean {
  const matches = expected.includes(value);
  return operator === "is" || operator === "isOneOf" ? matches : !matches;
}

function simpleRuleMatches(value: string, rule: Extract<ExportValidationRule, { kind: "simple" }>): boolean {
  if (!value) return true;
  if (rule.validation === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (rule.validation === "url") { try { return Boolean(new URL(value)); } catch { return false; } }
  if (rule.validation === "digitsOnly") return /^\d+$/.test(value);
  if (rule.validation === "noDigits") return !/\d/.test(value);
  if (rule.validation === "noSpaces") return !/\s/.test(value);
  if (rule.validation === "contains") return value.includes(rule.value ?? "");
  if (rule.validation === "doesNotContain") return !value.includes(rule.value ?? "");
  if (rule.validation === "startsWith") return value.startsWith(rule.value ?? "");
  return value.endsWith(rule.value ?? "");
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
    if (!["canonical", "custom", "fixed", "parameter", "empty"].includes(item.source.kind)) {
      issues.push({ columnId: item.id, message: `Column '${header || "Unnamed column"}' uses an unsupported value source.` });
    }
    const rules = rulesFor(item);
    if (item.source.kind === "empty" && rules.some((rule) => rule.kind === "required" && rule.outcome === "block")) {
      issues.push({ columnId: item.id, outcome: "block", message: `${item.header || "Unnamed column"} is required but configured to leave every value empty.` });
    }
    if (item.source.kind === "parameter" && rules.some((rule) => rule.kind === "required") && isEmpty(parameters[item.source.key] ?? item.source.defaultValue)) {
      issues.push({ columnId: item.id, message: `Enter ${item.source.label}.` });
    }
    for (const warning of item.sourceValidationWarnings ?? []) {
      issues.push({ columnId: item.id, outcome: "review", message: `${item.header || "Unnamed column"}: ${warning}` });
    }
    const allowed = rules.find((rule): rule is Extract<ExportValidationRule, { kind: "allowedValues" }> => rule.kind === "allowedValues");
    if (item.source.kind === "fixed" && allowed && !isEmpty(item.source.value) && !allowed.values.includes(item.source.value)) {
      issues.push({ columnId: item.id, outcome: allowed.outcome, message: `${item.header || "Unnamed column"} fixed value is not allowed.` });
    }
  });

  const columns = template.columns.map((item, index) => ({
    key: `column_${index}`,
    header: item.header,
  }));
  const byId = new Map(template.columns.map((column) => [column.id, column]));
  const rows = leads.map((lead) => {
    const resolved = new Map<string, ExportValue>();
    const resolving = new Set<string>();
    const resolve = (item: ExportTemplateColumn): ExportValue => {
      const prior = resolved.get(item.id);
      if (prior !== undefined) return prior;
      if (resolving.has(item.id)) {
        issues.push({ columnId: item.id, outcome: "block", message: `${item.header || "Unnamed column"} has a circular validation dependency.` });
        return "";
      }
      resolving.add(item.id);
      let value = sourceValue(lead, item.source, parameters);
      if (isEmpty(value) && item.defaultValue !== undefined) value = item.defaultValue;
      value = mappedValue(value, item.valueMappings);
      const finalValue = formattedValue(value, item.format, item.datePattern);
      resolved.set(item.id, finalValue);
      resolving.delete(item.id);
      return finalValue;
    };
    const output = template.columns.map((item, index) => {
      const finalValue = resolve(item);
      const value = displayValue(finalValue);
      for (const rule of rulesFor(item)) {
        let invalid = false;
        if (rule.kind === "required") invalid = !value;
        if (rule.kind === "requiredWhen") {
          const parent = byId.get(rule.parentColumnId);
          invalid = !parent || (conditionMatches(displayValue(resolve(parent)), rule.operator, rule.values) && !value);
        }
        if (rule.kind === "allowedValues") invalid = Boolean(value) && !rule.values.includes(value);
        if (rule.kind === "dependentAllowedValues") {
          const parent = byId.get(rule.parentColumnId);
          const allowed = parent ? rule.cases[displayValue(resolve(parent))] : undefined;
          invalid = !parent || (Boolean(value) && Boolean(allowed) && !allowed!.includes(value));
        }
        if (rule.kind === "simple") invalid = !simpleRuleMatches(value, rule);
        if (invalid) issues.push({ columnId: item.id, outcome: rule.outcome, message: `${item.header || "Unnamed column"} is invalid for source row ${lead.provenance.rowNumber}.` });
      }
      return [`column_${index}`, finalValue];
    });
    return Object.fromEntries(output);
  });

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
    columns: [
      {
        id: templateColumnId(),
        header: "Email",
        source: { kind: "canonical", field: "emailProfessional" },
        format: "text",
      },
      {
        id: templateColumnId(),
        header: "First name",
        source: { kind: "canonical", field: "firstName" },
        format: "text",
      },
      {
        id: templateColumnId(),
        header: "Last name",
        source: { kind: "canonical", field: "lastName" },
        format: "text",
      },
    ],
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
