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

function missingFieldIssue(row: number, field: CanonicalField): DataIssue {
  return {
    id: `${row}:${field}:missing`,
    row,
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
      issues.push(missingFieldIssue(lead.sourceRow, field));
    }
  }

  if (lead.email !== undefined) {
    if (!isValidEmail(lead.email)) {
      issues.push({
        id: `${lead.sourceRow}:email:invalid`,
        row: lead.sourceRow,
        field: "email",
        type: "invalid",
        severity: "error",
        message: "Email format is invalid",
        originalValue: lead.email,
      });
    } else if (isPersonalEmail(lead.email) && config.personalEmailPolicy !== "allow") {
      issues.push({
        id: `${lead.sourceRow}:email:personal`,
        row: lead.sourceRow,
        field: "email",
        type: "warning",
        severity: config.personalEmailPolicy === "block" ? "error" : "warning",
        message: "Personal email domain detected",
        originalValue: lead.email,
      });
    }
  }

  return issues;
}
