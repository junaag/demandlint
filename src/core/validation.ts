import type {
  CanonicalField,
  CanonicalLead,
  DataIssue,
  ProcessingConfig,
} from "./domain";

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.fr",
  "outlook.com",
  "hotmail.com",
  "hotmail.fr",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getEmailDomain(email: string): string | undefined {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return undefined;
  return email.slice(at + 1).toLowerCase();
}

export function isPersonalEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  return domain !== undefined && PERSONAL_EMAIL_DOMAINS.has(domain);
}

function issueBase(lead: CanonicalLead) {
  return {
    recordId: lead.recordId,
    provenance: lead.provenance,
    row: lead.sourceRow,
  } as const;
}

function missingFieldIssue(lead: CanonicalLead, field: CanonicalField): DataIssue {
  return {
    id: `${lead.recordId}:${field}:missing`,
    ...issueBase(lead),
    field,
    type: "missing",
    severity: "error",
    message: `${field} is required`,
  };
}

export function validateLead(
  lead: CanonicalLead,
  config: ProcessingConfig,
): DataIssue[] {
  const issues: DataIssue[] = [];

  for (const field of config.requiredFields) {
    if (lead[field] === undefined || lead[field] === "") {
      issues.push(missingFieldIssue(lead, field));
    }
  }

  const invalidEmailPoints = lead.emails?.filter((email) => !email.valid) ?? [];
  for (const email of invalidEmailPoints) {
    const isOnlyAvailableEmail = !lead.emails?.some((candidate) => candidate.valid);
    issues.push({
      id: `${lead.recordId}:email:${email.sourceColumns.join("+")}:invalid`,
      ...issueBase(lead),
      field: email.kind === "professional"
        ? "emailProfessional"
        : email.kind === "secondary"
          ? "emailSecondary"
          : email.kind === "personal"
            ? "emailPersonal"
            : "email",
      type: "invalid",
      severity: isOnlyAvailableEmail ? "error" : "warning",
      message: isOnlyAvailableEmail
        ? "No valid email is available"
        : "Invalid alternate email was not selected",
      originalValue: email.rawValue,
    });
  }

  const primaryEmailPoint = lead.emails?.find((email) => email.value === lead.email);
  if (lead.email !== undefined && (primaryEmailPoint?.valid ?? true)) {
    if (!isValidEmail(lead.email)) {
      issues.push({
        id: `${lead.recordId}:email:invalid`,
        ...issueBase(lead),
        field: "email",
        type: "invalid",
        severity: "error",
        message: "Email format is invalid",
        originalValue: lead.email,
      });
    } else if (isPersonalEmail(lead.email) && config.personalEmailPolicy !== "allow") {
      issues.push({
        id: `${lead.recordId}:email:personal`,
        ...issueBase(lead),
        field: "email",
        type: "warning",
        severity: config.personalEmailPolicy === "block" ? "error" : "warning",
        message: "Personal email domain detected",
        originalValue: lead.email,
      });
    }
  }

  for (const phone of lead.phones ?? []) {
    if (phone.validity === "valid") continue;
    const field: CanonicalField = phone.kind === "mobile"
      ? "phoneMobile"
      : phone.kind === "direct"
        ? "phoneDirect"
        : phone.kind === "standard"
          ? "phoneStandard"
          : "phone";
    issues.push({
      id: `${lead.recordId}:phone:${phone.sourceColumns.join("+")}:${phone.validity}`,
      ...issueBase(lead),
      field,
      type: "invalid",
      severity: "warning",
      message: phone.validity === "ambiguous"
        ? "Phone country is missing or unsupported; E.164 conversion needs review"
        : "Phone number could not be validated as E.164",
      originalValue: phone.rawValue,
    });
  }

  return issues;
}
