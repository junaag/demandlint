export type EmailRejectionReason = "consumer" | "disposable";

export interface EmailEligibility {
  email: string;
  eligible: boolean;
  reason?: EmailRejectionReason;
}

export const PROFESSIONAL_EMAIL_REQUIRED_TITLE = "Professional email required";
export const CONSUMER_EMAIL_MESSAGE =
  "DemandLint is available for business accounts only. Please sign in with your work email address.";
export const DISPOSABLE_EMAIL_MESSAGE =
  "Temporary email addresses are not supported. Please use your work email address.";
export const PERSONAL_GMAIL_EXCEPTION = "ju.imbert@gmail.com";
export const PERSONAL_GMAIL_WORKSPACE_NAME = "Julien Perso";

const consumerExactDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "icloud.com",
  "mac.com",
  "mail.com",
  "me.com",
  "outlook.com",
  "proton.me",
  "rocketmail.com",
  "ymail.com",
]);

const consumerDomainPrefixes = [
  "aol.",
  "gmx.",
  "hotmail.",
  "live.",
  "msn.",
  "protonmail.",
  "yahoo.",
] as const;

const disposableDomains = new Set([
  "10minutemail.com",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getnada.com",
  "grr.la",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "maildrop.cc",
  "mailinator.com",
  "mintemail.com",
  "moakt.com",
  "mytemp.email",
  "sharklasers.com",
  "temp-mail.org",
  "tempail.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
]);

export function normalizeProfessionalEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid work email address.");
  }
  return email;
}

function isDomainOrSubdomain(domain: string, blockedDomain: string): boolean {
  return domain === blockedDomain || domain.endsWith(`.${blockedDomain}`);
}

export function evaluateProfessionalEmail(value: string): EmailEligibility {
  const email = normalizeProfessionalEmail(value);
  if (email === PERSONAL_GMAIL_EXCEPTION) return { email, eligible: true };

  const domain = email.slice(email.lastIndexOf("@") + 1);
  if ([...disposableDomains].some((blocked) => isDomainOrSubdomain(domain, blocked))) {
    return { email, eligible: false, reason: "disposable" };
  }
  if (
    consumerExactDomains.has(domain)
    || consumerDomainPrefixes.some((prefix) => domain.startsWith(prefix))
  ) {
    return { email, eligible: false, reason: "consumer" };
  }
  return { email, eligible: true };
}

export class EmailEligibilityError extends Error {
  readonly title = PROFESSIONAL_EMAIL_REQUIRED_TITLE;

  constructor(readonly reason: EmailRejectionReason) {
    super(reason === "disposable" ? DISPOSABLE_EMAIL_MESSAGE : CONSUMER_EMAIL_MESSAGE);
    this.name = "EmailEligibilityError";
  }
}

export function assertProfessionalEmail(value: string): string {
  const result = evaluateProfessionalEmail(value);
  if (!result.eligible && result.reason) throw new EmailEligibilityError(result.reason);
  return result.email;
}

export function emailEligibilityError(reason: string | null | undefined): EmailEligibilityError | null {
  return reason === "consumer" || reason === "disposable"
    ? new EmailEligibilityError(reason)
    : null;
}
