import type {
  CanonicalField,
  ContactPreferences,
  EmailKind,
  PhoneKind,
} from "./domain";

export const DEFAULT_CONTACT_PREFERENCES: ContactPreferences = {
  emailPriority: ["professional", "secondary", "personal", "other"],
  phonePriority: ["mobile", "direct", "standard", "other"],
  defaultPhoneCountry: "FR",
  exportMode: "all",
};

export const EMAIL_FIELDS: readonly CanonicalField[] = [
  "email",
  "emailProfessional",
  "emailSecondary",
  "emailPersonal",
];

export const PHONE_FIELDS: readonly CanonicalField[] = [
  "phone",
  "phoneMobile",
  "phoneDirect",
  "phoneStandard",
];

export function isEmailField(field: CanonicalField): boolean {
  return EMAIL_FIELDS.includes(field);
}

export function isPhoneField(field: CanonicalField): boolean {
  return PHONE_FIELDS.includes(field);
}

export function emailKindForField(field: CanonicalField): EmailKind | undefined {
  if (field === "emailProfessional") return "professional";
  if (field === "emailSecondary") return "secondary";
  if (field === "emailPersonal") return "personal";
  if (field === "email") return "other";
  return undefined;
}

export function phoneKindForField(field: CanonicalField): PhoneKind | undefined {
  if (field === "phoneMobile") return "mobile";
  if (field === "phoneDirect") return "direct";
  if (field === "phoneStandard") return "standard";
  if (field === "phone") return "other";
  return undefined;
}

export function resolveContactPreferences(
  preferences: Partial<ContactPreferences> = {},
): ContactPreferences {
  return {
    emailPriority: completePriority(
      preferences.emailPriority,
      DEFAULT_CONTACT_PREFERENCES.emailPriority,
    ),
    phonePriority: completePriority(
      preferences.phonePriority,
      DEFAULT_CONTACT_PREFERENCES.phonePriority,
    ),
    defaultPhoneCountry:
      preferences.defaultPhoneCountry?.trim().toUpperCase()
      || DEFAULT_CONTACT_PREFERENCES.defaultPhoneCountry,
    exportMode: preferences.exportMode ?? DEFAULT_CONTACT_PREFERENCES.exportMode,
  };
}

function completePriority<T extends string>(
  requested: readonly T[] | undefined,
  fallback: readonly T[],
): T[] {
  const valid = new Set(fallback);
  const result: T[] = [];

  for (const item of requested ?? []) {
    if (valid.has(item) && !result.includes(item)) result.push(item);
  }
  for (const item of fallback) {
    if (!result.includes(item)) result.push(item);
  }

  return result;
}
