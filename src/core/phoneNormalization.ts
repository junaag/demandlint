import type { PhoneValidity } from "./domain";

const EMPTY_PHONE_TOKENS = new Set(["", "n/a", "na", "null", "-", "--", "unknown"]);

function normalizedText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).normalize("NFKC").replace(/\s+/g, " ").trim();
  return EMPTY_PHONE_TOKENS.has(text.toLowerCase()) ? undefined : text;
}

interface CountryPhoneMetadata {
  callingCode: string;
  nationalPrefix?: string;
  minNationalLength: number;
  maxNationalLength: number;
  preserveNationalPrefix?: boolean;
}

const COUNTRY_PHONE_METADATA: Record<string, CountryPhoneMetadata> = {
  FR: { callingCode: "33", nationalPrefix: "0", minNationalLength: 9, maxNationalLength: 9 },
  ES: { callingCode: "34", minNationalLength: 9, maxNationalLength: 9 },
  PT: { callingCode: "351", minNationalLength: 9, maxNationalLength: 9 },
  GB: { callingCode: "44", nationalPrefix: "0", minNationalLength: 9, maxNationalLength: 10 },
  BE: { callingCode: "32", nationalPrefix: "0", minNationalLength: 8, maxNationalLength: 9 },
  DE: { callingCode: "49", nationalPrefix: "0", minNationalLength: 5, maxNationalLength: 11 },
  IT: {
    callingCode: "39",
    nationalPrefix: "0",
    minNationalLength: 6,
    maxNationalLength: 11,
    preserveNationalPrefix: true,
  },
  NL: { callingCode: "31", nationalPrefix: "0", minNationalLength: 9, maxNationalLength: 9 },
  CH: { callingCode: "41", nationalPrefix: "0", minNationalLength: 9, maxNationalLength: 9 },
  AT: { callingCode: "43", nationalPrefix: "0", minNationalLength: 7, maxNationalLength: 12 },
  IE: { callingCode: "353", nationalPrefix: "0", minNationalLength: 7, maxNationalLength: 9 },
  LU: { callingCode: "352", minNationalLength: 4, maxNationalLength: 11 },
  US: { callingCode: "1", minNationalLength: 10, maxNationalLength: 10 },
  CA: { callingCode: "1", minNationalLength: 10, maxNationalLength: 10 },
};

const COUNTRY_ALIASES: Record<string, string> = {
  france: "FR",
  french: "FR",
  fr: "FR",
  espagne: "ES",
  spain: "ES",
  espana: "ES",
  es: "ES",
  portugal: "PT",
  pt: "PT",
  "royaume uni": "GB",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  belgique: "BE",
  belgium: "BE",
  be: "BE",
  allemagne: "DE",
  germany: "DE",
  deutschland: "DE",
  de: "DE",
  italie: "IT",
  italy: "IT",
  italia: "IT",
  it: "IT",
  "pays bas": "NL",
  netherlands: "NL",
  holland: "NL",
  nl: "NL",
  suisse: "CH",
  switzerland: "CH",
  ch: "CH",
  autriche: "AT",
  austria: "AT",
  at: "AT",
  irlande: "IE",
  ireland: "IE",
  ie: "IE",
  luxembourg: "LU",
  lu: "LU",
  "etats unis": "US",
  usa: "US",
  "united states": "US",
  us: "US",
  canada: "CA",
  ca: "CA",
};

export interface NormalizedPhone {
  rawValue: string;
  e164?: string | undefined;
  extension?: string | undefined;
  countryCode?: string | undefined;
  validity: PhoneValidity;
}

function canonicalizeCountry(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolvePhoneCountry(value: unknown): string | undefined {
  const text = normalizedText(value);
  if (!text) return undefined;
  const normalized = canonicalizeCountry(text);
  const alias = COUNTRY_ALIASES[normalized];
  if (alias) return alias;
  const iso = text.trim().toUpperCase();
  return COUNTRY_PHONE_METADATA[iso] ? iso : undefined;
}

function extractExtension(value: string): { number: string; extension?: string } {
  const match = value.match(/(?:\b(?:ext(?:ension)?\.?|poste)|\bx)\s*[:.-]?\s*(\d+)\s*$/i);
  if (!match || !match[1] || match.index === undefined) return { number: value };
  return {
    number: value.slice(0, match.index).trim(),
    extension: match[1],
  };
}

function internationalResult(
  rawValue: string,
  digits: string,
  extension?: string,
): NormalizedPhone {
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) {
    return { rawValue, extension, validity: "invalid" };
  }
  return { rawValue, e164: `+${digits}`, extension, validity: "valid" };
}

export function normalizePhone(
  value: unknown,
  country: unknown,
  fallbackCountry = "FR",
): NormalizedPhone | undefined {
  const rawValue = normalizedText(value);
  if (!rawValue) return undefined;

  const { number, extension } = extractExtension(rawValue);
  const trimmed = number.trim();
  const explicitInternational = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "");

  if (explicitInternational) {
    const internationalDigits = trimmed.startsWith("00") ? digits.slice(2) : digits;
    return internationalResult(rawValue, internationalDigits, extension);
  }

  if (digits.length === 0) {
    return { rawValue, extension, validity: "invalid" };
  }

  const rowCountryText = normalizedText(country);
  const rowCountryCode = resolvePhoneCountry(country);
  if (rowCountryText && !rowCountryCode) {
    return { rawValue, extension, validity: "ambiguous" };
  }
  const countryCode = rowCountryCode ?? resolvePhoneCountry(fallbackCountry);
  if (!countryCode) {
    return { rawValue, extension, validity: "ambiguous" };
  }

  const metadata = COUNTRY_PHONE_METADATA[countryCode];
  if (!metadata) {
    return { rawValue, extension, countryCode, validity: "ambiguous" };
  }

  let nationalDigits = digits;
  const alreadyInternational =
    digits.startsWith(metadata.callingCode)
    && digits.length > metadata.maxNationalLength;
  if (alreadyInternational) {
    return {
      ...internationalResult(rawValue, digits, extension),
      countryCode,
    };
  }

  if (
    metadata.nationalPrefix
    && !metadata.preserveNationalPrefix
    && nationalDigits.startsWith(metadata.nationalPrefix)
  ) {
    nationalDigits = nationalDigits.slice(metadata.nationalPrefix.length);
  }

  if (
    nationalDigits.length < metadata.minNationalLength
    || nationalDigits.length > metadata.maxNationalLength
  ) {
    return { rawValue, extension, countryCode, validity: "invalid" };
  }

  const internationalDigits = `${metadata.callingCode}${nationalDigits}`;
  if (internationalDigits.length > 15) {
    return { rawValue, extension, countryCode, validity: "invalid" };
  }

  return {
    rawValue,
    e164: `+${internationalDigits}`,
    extension,
    countryCode,
    validity: "valid",
  };
}
