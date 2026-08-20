import {
  emailKindForField,
  isEmailField,
  isPhoneField,
  phoneKindForField,
  resolveContactPreferences,
} from "./contactPoints";
import type {
  CanonicalField,
  CanonicalLead,
  ColumnMapping,
  ContactPreferences,
  DataIssue,
  DatasetSource,
  EmailContactPoint,
  PhoneContactPoint,
  RawRow,
} from "./domain";
import { normalizePhone } from "./phoneNormalization";
import { createRecordId, createRecordProvenance, DEFAULT_DATASET_SOURCE } from "./provenance";

const EMPTY_TOKENS = new Set(["", "n/a", "na", "null", "-", "--", "unknown"]);

export function normalizeText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  const normalized = String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

  if (EMPTY_TOKENS.has(normalized.toLowerCase())) return undefined;
  return normalized;
}

export function normalizeEmail(value: unknown): string | undefined {
  return normalizeText(value)?.toLowerCase();
}

function isValidEmailSyntax(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeSimpleField(field: CanonicalField, value: unknown): string | undefined {
  if (isEmailField(field)) return normalizeEmail(value);
  return normalizeText(value);
}

function assignCanonicalString(
  lead: CanonicalLead,
  field: CanonicalField,
  value: string,
): void {
  lead[field] = value;
}

function normalizationIssue(
  lead: CanonicalLead,
  field: CanonicalField,
  sourceColumn: string,
  originalValue: unknown,
  proposedValue: string | undefined,
): DataIssue | undefined {
  if (originalValue === null || originalValue === undefined) return undefined;
  const originalText = String(originalValue);
  if (originalText === proposedValue) return undefined;

  return {
    id: `${lead.recordId}:${field}:${sourceColumn}:normalization`,
    recordId: lead.recordId,
    provenance: lead.provenance,
    row: lead.sourceRow,
    field,
    type: "normalization",
    severity: "info",
    message: `${field} was normalized`,
    originalValue,
    proposedValue: proposedValue ?? "",
  };
}

function emailPointsForRow(
  row: RawRow,
  mapping: ColumnMapping,
  lead: CanonicalLead,
  issues: DataIssue[],
  preferences: ContactPreferences,
): EmailContactPoint[] {
  const candidates: EmailContactPoint[] = [];

  for (const [sourceColumn, targetField] of Object.entries(mapping)) {
    if (targetField === "ignore" || !isEmailField(targetField)) continue;
    const kind = emailKindForField(targetField);
    const value = normalizeEmail(row[sourceColumn]);
    if (!kind || value === undefined) continue;

    assignCanonicalString(lead, targetField, value);
    candidates.push({
      kind,
      rawValue: String(row[sourceColumn]),
      value,
      valid: isValidEmailSyntax(value),
      sourceColumns: [sourceColumn],
    });

    const issue = normalizationIssue(
      lead,
      targetField,
      sourceColumn,
      row[sourceColumn],
      value,
    );
    if (issue) issues.push(issue);
  }

  const unique = new Map<string, EmailContactPoint>();
  for (const candidate of candidates) {
    const existing = unique.get(candidate.value);
    if (!existing) {
      unique.set(candidate.value, candidate);
      continue;
    }
    existing.sourceColumns.push(...candidate.sourceColumns);
    if (
      preferences.emailPriority.indexOf(candidate.kind)
      < preferences.emailPriority.indexOf(existing.kind)
    ) {
      existing.kind = candidate.kind;
    }
  }

  return [...unique.values()];
}

function phonePointsForRow(
  row: RawRow,
  mapping: ColumnMapping,
  lead: CanonicalLead,
  issues: DataIssue[],
  preferences: ContactPreferences,
): PhoneContactPoint[] {
  const candidates: PhoneContactPoint[] = [];

  for (const [sourceColumn, targetField] of Object.entries(mapping)) {
    if (targetField === "ignore" || !isPhoneField(targetField)) continue;
    const kind = phoneKindForField(targetField);
    const phone = normalizePhone(
      row[sourceColumn],
      lead.country,
      preferences.defaultPhoneCountry,
    );
    if (!kind || !phone) continue;

    const normalizedValue = phone.e164 ?? phone.rawValue;
    assignCanonicalString(lead, targetField, normalizedValue);
    candidates.push({
      kind,
      rawValue: phone.rawValue,
      e164: phone.e164,
      extension: phone.extension,
      countryCode: phone.countryCode,
      validity: phone.validity,
      sourceColumns: [sourceColumn],
    });

    if (phone.e164) {
      const issue = normalizationIssue(
        lead,
        targetField,
        sourceColumn,
        row[sourceColumn],
        phone.e164,
      );
      if (issue) issues.push(issue);
    }
  }

  const unique = new Map<string, PhoneContactPoint>();
  for (const candidate of candidates) {
    const key = candidate.e164 ?? candidate.rawValue.replace(/\s+/g, "").toLowerCase();
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, candidate);
      continue;
    }
    existing.sourceColumns.push(...candidate.sourceColumns);
    if (
      preferences.phonePriority.indexOf(candidate.kind)
      < preferences.phonePriority.indexOf(existing.kind)
    ) {
      existing.kind = candidate.kind;
    }
  }

  return [...unique.values()];
}

function byPriority<T extends { kind: string }>(
  points: readonly T[],
  priority: readonly string[],
): T[] {
  return [...points].sort((left, right) => {
    const leftIndex = priority.indexOf(left.kind);
    const rightIndex = priority.indexOf(right.kind);
    return (leftIndex < 0 ? priority.length : leftIndex)
      - (rightIndex < 0 ? priority.length : rightIndex);
  });
}

export interface NormalizationResult {
  lead: CanonicalLead;
  issues: DataIssue[];
}

export function normalizeRow(
  row: RawRow,
  mapping: ColumnMapping,
  sourceRow: number,
  defaults: Partial<Omit<CanonicalLead, "recordId" | "provenance" | "sourceRow" | "customFields">> = {},
  source: DatasetSource = DEFAULT_DATASET_SOURCE,
  contactPreferences: Partial<ContactPreferences> = {},
): NormalizationResult {
  const provenance = createRecordProvenance(source, sourceRow);
  const recordId = createRecordId(provenance);
  const lead: CanonicalLead = {
    recordId,
    provenance,
    sourceRow,
  };
  const issues: DataIssue[] = [];
  const preferences = resolveContactPreferences(contactPreferences);

  // Populate non-contact values first so phone parsing can use the row country
  // regardless of the source-column order.
  for (const [sourceColumn, targetField] of Object.entries(mapping)) {
    if (
      targetField === "ignore"
      || isEmailField(targetField)
      || isPhoneField(targetField)
    ) continue;

    const originalValue = row[sourceColumn];
    const normalizedValue = normalizeSimpleField(targetField, originalValue);
    if (normalizedValue !== undefined) {
      assignCanonicalString(lead, targetField, normalizedValue);
    }

    const issue = normalizationIssue(
      lead,
      targetField,
      sourceColumn,
      originalValue,
      normalizedValue,
    );
    if (issue) issues.push(issue);
  }

  const emails = emailPointsForRow(row, mapping, lead, issues, preferences);
  if (emails.length > 0) {
    lead.emails = emails;
    const ordered = byPriority(emails, preferences.emailPriority);
    const primary = ordered.find((email) => email.valid) ?? ordered[0];
    if (primary) lead.email = primary.value;
  }

  const phones = phonePointsForRow(row, mapping, lead, issues, preferences);
  if (phones.length > 0) {
    lead.phones = phones;
    const ordered = byPriority(phones, preferences.phonePriority);
    const primary = ordered.find((phone) => phone.validity === "valid") ?? ordered[0];
    if (primary) lead.phone = primary.e164 ?? primary.rawValue;
  }

  for (const [field, value] of Object.entries(defaults)) {
    if (typeof value !== "string") continue;
    const canonicalField = field as CanonicalField;
    if (lead[canonicalField] === undefined) {
      assignCanonicalString(lead, canonicalField, value);
    }
  }

  return { lead, issues };
}
