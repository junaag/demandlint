import type { CanonicalField, CanonicalLead, CustomFieldValue } from "../core/domain";
import type { DataExportFormat } from "./exportFileName";

export type ExportValue = string | number | boolean | Date | null;

export type ExportColumnSource =
  | { kind: "canonical"; field: CanonicalField }
  | { kind: "custom"; key: string }
  /** Runtime value is supplied by column id when the template is used. */
  | { kind: "fixed"; value?: string }
  // Retained only to deserialize v0.3.7 templates.
  | { kind: "parameter"; key: string; label: string; defaultValue?: string }
  | { kind: "empty" };

export type ExportValueFormat = "text" | "date" | "datetime" | "number" | "boolean";
export type ExportDatePattern =
  | "yyyy-MM-dd" | "yyyy/MM/dd" | "MM/dd/yyyy" | "dd/MM/yyyy"
  | "dd-MM-yyyy" | "MM-dd-yyyy" | "dd.MM.yyyy" | "MM.dd.yyyy" | "yyyyMMdd"
  | "dd/MM/yy" | "MM/dd/yy"
  | "yyyy-MM-dd HH:mm" | "yyyy-MM-dd HH:mm:ss" | "yyyy/MM/dd HH:mm"
  | "dd/MM/yyyy HH:mm" | "dd/MM/yyyy HH:mm:ss" | "MM/dd/yyyy HH:mm" | "MM/dd/yyyy HH:mm:ss"
  | "dd/MM/yy HH:mm" | "MM/dd/yy HH:mm"
  | "MM/dd/yyyy hh:mm AM/PM" | "dd/MM/yyyy hh:mm AM/PM"
  | "iso-datetime";

export interface ExportValueMapping {
  from: string;
  to: string;
}

export type EmptyValueHandling =
  | { kind: "required" }
  | { kind: "replace"; value: string }
  | { kind: "leaveBlank" };

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
  /** The one mutually-exclusive policy for an empty resolved value. */
  emptyValueHandling?: EmptyValueHandling;
  /** v0.3.8 normalized validation rules. `required` below is read as a legacy rule. */
  validationRules?: ExportValidationRule[];
  /** Structured source rules that were detected but could not safely be normalized. */
  sourceValidationWarnings?: string[];
  /** v0.3.8 compatibility only. Normalized on template persistence. */
  required?: boolean;
  defaultValue?: string;
  format?: ExportValueFormat;
  datePattern?: ExportDatePattern;
  valueMappings?: ExportValueMapping[];
}

export type ExportTemplateWorkbookSourceType = "xlsx" | "xls";

export interface ExportTemplateWorkbook {
  storagePath: string;
  originalFileName: string;
  originalFileType: ExportTemplateWorkbookSourceType;
  storedFileType: "xlsx";
  targetSheet: string;
  headerRow: number;
  firstDataRow: number;
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
  workbook?: ExportTemplateWorkbook;
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
  marketingConsent: "Contact Opt-in",
  salesFollowUpRequested: "Sales follow-up requested",
  contactNotes: "Contact notes",
};

/** Current, broadly reusable DemandLint concepts. Older ids remain readable for saved mappings. */
export const CURRENT_CANONICAL_FIELDS: CanonicalField[] = [
  "firstName", "lastName", "email", "emailProfessional", "emailSecondary", "emailPersonal",
  "company", "jobTitle", "phone", "phoneMobile", "phoneDirect", "phoneStandard", "country",
  "stateProvince", "city", "postalCode", "address", "salutation", "jobLevel", "department",
  "website", "industry", "marketingConsent",
];

export const CANONICAL_FIELD_OPTIONS = CURRENT_CANONICAL_FIELDS.map(
  (value) => ({ value, label: CANONICAL_FIELD_LABELS[value] }),
);

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

function sourceValue(
  lead: CanonicalLead,
  columnId: string,
  source: ExportColumnSource,
  parameters: ExportParameterValues,
): CustomFieldValue | undefined {
  if (source.kind === "canonical") return lead[source.field] as CustomFieldValue | undefined;
  if (source.kind === "custom") return lead.customFields?.[source.key];
  // `source.value` exists only on a legacy v0.3.8 record that has not yet been saved.
  if (source.kind === "fixed") return parameters[columnId] ?? source.value;
  if (source.kind === "parameter") return parameters[source.key] ?? source.defaultValue;
  return "";
}

export function emptyValueHandlingFor(column: ExportTemplateColumn): EmptyValueHandling {
  if (column.emptyValueHandling) return column.emptyValueHandling;
  // A legacy default took precedence in the previous execution pipeline.
  if (column.defaultValue !== undefined) return { kind: "replace", value: column.defaultValue };
  if (column.required || column.validationRules?.some((rule) => rule.kind === "required")) return { kind: "required" };
  return { kind: "leaveBlank" };
}

function rulesFor(column: ExportTemplateColumn): ExportValidationRule[] {
  return (column.validationRules ?? []).filter((rule) => rule.kind !== "required");
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
  const shortYear = year.slice(-2);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  const twelveHour = date.getUTCHours() % 12 || 12;
  const amPm = date.getUTCHours() < 12 ? "AM" : "PM";
  const datePatterns: Partial<Record<ExportDatePattern, string>> = {
    "yyyy/MM/dd": `${year}/${month}/${day}`,
    "MM/dd/yyyy": `${month}/${day}/${year}`,
    "dd/MM/yyyy": `${day}/${month}/${year}`,
    "dd-MM-yyyy": `${day}-${month}-${year}`,
    "MM-dd-yyyy": `${month}-${day}-${year}`,
    "dd.MM.yyyy": `${day}.${month}.${year}`,
    "MM.dd.yyyy": `${month}.${day}.${year}`,
    yyyyMMdd: `${year}${month}${day}`,
    "dd/MM/yy": `${day}/${month}/${shortYear}`,
    "MM/dd/yy": `${month}/${day}/${shortYear}`,
    "yyyy-MM-dd HH:mm": `${year}-${month}-${day} ${hours}:${minutes}`,
    "yyyy-MM-dd HH:mm:ss": `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
    "yyyy/MM/dd HH:mm": `${year}/${month}/${day} ${hours}:${minutes}`,
    "dd/MM/yyyy HH:mm": `${day}/${month}/${year} ${hours}:${minutes}`,
    "dd/MM/yyyy HH:mm:ss": `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`,
    "MM/dd/yyyy HH:mm": `${month}/${day}/${year} ${hours}:${minutes}`,
    "MM/dd/yyyy HH:mm:ss": `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`,
    "dd/MM/yy HH:mm": `${day}/${month}/${shortYear} ${hours}:${minutes}`,
    "MM/dd/yy HH:mm": `${month}/${day}/${shortYear} ${hours}:${minutes}`,
    "MM/dd/yyyy hh:mm AM/PM": `${month}/${day}/${year} ${String(twelveHour).padStart(2, "0")}:${minutes} ${amPm}`,
    "dd/MM/yyyy hh:mm AM/PM": `${day}/${month}/${year} ${String(twelveHour).padStart(2, "0")}:${minutes} ${amPm}`,
  };
  if (datePatterns[pattern]) return datePatterns[pattern]!;
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
    const emptyHandling = emptyValueHandlingFor(item);
    if (item.source.kind === "parameter" && emptyHandling.kind === "required" && isEmpty(parameters[item.source.key] ?? item.source.defaultValue)) {
      issues.push({ columnId: item.id, message: `Enter ${item.source.label}.` });
    }
    for (const warning of item.sourceValidationWarnings ?? []) {
      issues.push({ columnId: item.id, outcome: "review", message: `${item.header || "Unnamed column"}: ${warning}` });
    }
    const allowed = rules.find((rule): rule is Extract<ExportValidationRule, { kind: "allowedValues" }> => rule.kind === "allowedValues");
    const fixedValue = item.source.kind === "fixed" ? parameters[item.id] ?? item.source.value : undefined;
    if (item.source.kind === "fixed" && allowed && !isEmpty(fixedValue) && !allowed.values.includes(fixedValue!)) {
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
      let value = sourceValue(lead, item.id, item.source, parameters);
      const emptyHandling = emptyValueHandlingFor(item);
      if (isEmpty(value) && emptyHandling.kind === "replace") value = emptyHandling.value;
      value = mappedValue(value, item.valueMappings);
      const finalValue = formattedValue(value, item.format, item.datePattern);
      resolved.set(item.id, finalValue);
      resolving.delete(item.id);
      return finalValue;
    };
    const output = template.columns.map((item, index) => {
      const finalValue = resolve(item);
      const value = displayValue(finalValue);
      if (!value && emptyValueHandlingFor(item).kind === "required") {
        issues.push({ columnId: item.id, outcome: "block", message: `${item.header || "Unnamed column"} is required for source row ${lead.provenance.rowNumber}.` });
      }
      for (const rule of rulesFor(item)) {
        let invalid = false;
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
  const idMap = new Map(template.columns.map((item) => [item.id, templateColumnId()]));
  const { workbook: _sourceWorkbook, ...templateWithoutWorkbook } = template;
  const { workbook: overrideWorkbook, ...otherOverrides } = overrides;
  return {
    ...templateWithoutWorkbook,
    ...otherOverrides,
    builtIn: overrides.builtIn ?? false,
    // A stored workbook belongs to one template. A clone starts detached unless
    // the caller explicitly supplies an independently stored workbook.
    ...(overrideWorkbook ? { workbook: { ...overrideWorkbook } } : {}),
    columns: template.columns.map((item) => ({
      ...item,
      id: idMap.get(item.id)!,
      source: { ...item.source },
      ...(item.validationRules ? { validationRules: item.validationRules.map((rule) => (
        rule.kind === "requiredWhen" || rule.kind === "dependentAllowedValues"
          ? { ...rule, parentColumnId: idMap.get(rule.parentColumnId) ?? rule.parentColumnId }
          : { ...rule }
      )) } : {}),
      ...(item.valueMappings
        ? { valueMappings: item.valueMappings.map((mapping) => ({ ...mapping })) }
        : {}),
    })),
  };
}

/** Deep copy for a normal save/edit operation; preserves column identity and dependencies. */
export function copyExportTemplate(template: ExportTemplate, overrides: Partial<ExportTemplate> = {}): ExportTemplate {
  return {
    ...template,
    ...overrides,
    ...(template.workbook || overrides.workbook
      ? { workbook: { ...(template.workbook ?? overrides.workbook!), ...(overrides.workbook ?? {}) } }
      : {}),
    columns: template.columns.map((item) => ({
      ...item,
      source: { ...item.source },
      ...(item.validationRules ? { validationRules: item.validationRules.map((rule) => ({ ...rule })) } : {}),
      ...(item.valueMappings ? { valueMappings: item.valueMappings.map((mapping) => ({ ...mapping })) } : {}),
    })),
  };
}

/**
 * Converts v0.3.8 persistence into the v0.3.9 design/runtime boundary.
 * A legacy fixed value remains usable until this template is next saved, then it
 * is deliberately removed so reusable templates no longer retain business data.
 */
export function normalizeExportTemplate(template: ExportTemplate): ExportTemplate {
  return {
    ...template,
    ...(template.workbook ? { workbook: { ...template.workbook } } : {}),
    columns: template.columns.map((column) => {
      const { required: _required, defaultValue: _defaultValue, ...rest } = column;
      const source = column.source.kind === "parameter"
        ? { kind: "fixed" as const }
        : column.source.kind === "fixed"
          ? { kind: "fixed" as const }
          : column.source;
      const rules = (column.validationRules ?? []).filter((rule) => rule.kind !== "required");
      return {
        ...rest,
        source,
        ...(source.kind !== "empty" ? { emptyValueHandling: emptyValueHandlingFor(column) } : {}),
        ...(rules.length ? { validationRules: rules } : {}),
      };
    }),
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
        emptyValueHandling: { kind: "leaveBlank" },
        format: "text",
      },
      {
        id: templateColumnId(),
        header: "First name",
        source: { kind: "canonical", field: "firstName" },
        emptyValueHandling: { kind: "leaveBlank" },
        format: "text",
      },
      {
        id: templateColumnId(),
        header: "Last name",
        source: { kind: "canonical", field: "lastName" },
        emptyValueHandling: { kind: "leaveBlank" },
        format: "text",
      },
    ],
    ...overrides,
  };
}

export function exportRuntimeColumns(template: ExportTemplate): ExportTemplateColumn[] {
  const seen = new Set<string>();
  return template.columns.filter((item) => {
    // A legacy fixed source may still carry a template value. It is already
    // resolved and must not be presented as a value to enter for this export.
    if ((item.source.kind !== "parameter" && (item.source.kind !== "fixed" || item.source.value !== undefined))) return false;
    const key = exportRuntimeValueKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The persisted runtime key used by the export builder for this column. */
export function exportRuntimeValueKey(column: ExportTemplateColumn): string {
  return column.source.kind === "parameter" ? column.source.key : column.id;
}

/** A stable, type-qualified identity used when carrying values between templates. */
export function exportRuntimeValueIdentity(column: ExportTemplateColumn): string {
  return `${column.source.kind}:${exportRuntimeValueKey(column)}`;
}

/** @deprecated use exportRuntimeColumns. */
export const exportParameterColumns = exportRuntimeColumns;
