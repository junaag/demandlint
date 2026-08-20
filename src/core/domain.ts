export type CanonicalField =
  | "firstName"
  | "lastName"
  | "email"
  | "emailProfessional"
  | "emailSecondary"
  | "emailPersonal"
  | "company"
  | "jobTitle"
  | "phone"
  | "phoneMobile"
  | "phoneDirect"
  | "phoneStandard"
  | "country"
  | "leadSource"
  | "campaignMemberStatus";

export type EmailKind = "professional" | "secondary" | "personal" | "other";
export type PhoneKind = "mobile" | "direct" | "standard" | "other";
export type PhoneValidity = "valid" | "possible" | "invalid" | "ambiguous";

export interface EmailContactPoint {
  kind: EmailKind;
  rawValue: string;
  value: string;
  valid: boolean;
  sourceColumns: string[];
}

export interface PhoneContactPoint {
  kind: PhoneKind;
  rawValue: string;
  e164?: string | undefined;
  extension?: string | undefined;
  countryCode?: string | undefined;
  validity: PhoneValidity;
  sourceColumns: string[];
}

export type ContactExportMode = "primary" | "all";

export interface ContactPreferences {
  emailPriority: EmailKind[];
  phonePriority: PhoneKind[];
  defaultPhoneCountry: string;
  exportMode: ContactExportMode;
}

export type RawRow = Record<string, unknown>;

export type ColumnMapping = Record<string, CanonicalField | "ignore">;

export type RecordId = string;

export interface DatasetSource {
  id: string;
  name: string;
  sourceType?: string;
  sheetName?: string;
  headerRowNumber?: number;
}

export interface RecordProvenance {
  sourceId: string;
  sourceName: string;
  rowNumber: number;
  sourceType?: string;
  sheetName?: string;
}

export type CustomFieldValue = string | number | boolean | null;
export type CustomFields = Record<string, CustomFieldValue>;

export interface CanonicalLead {
  recordId: RecordId;
  provenance: RecordProvenance;
  firstName?: string;
  lastName?: string;
  /** Best available email according to the active contact preferences. */
  email?: string;
  emailProfessional?: string;
  emailSecondary?: string;
  emailPersonal?: string;
  emails?: EmailContactPoint[];
  company?: string;
  jobTitle?: string;
  /** Best available phone according to the active contact preferences. */
  phone?: string;
  phoneMobile?: string;
  phoneDirect?: string;
  phoneStandard?: string;
  phones?: PhoneContactPoint[];
  country?: string;
  leadSource?: string;
  campaignMemberStatus?: string;
  customFields?: CustomFields;
  /** @deprecated Use provenance.rowNumber for multi-source workflows. */
  sourceRow: number;
}

export type IssueType =
  | "missing"
  | "invalid"
  | "duplicate"
  | "warning"
  | "normalization";

export type IssueSeverity = "error" | "warning" | "info";

export interface DataIssue {
  id: string;
  recordId: RecordId;
  provenance: RecordProvenance;
  /** @deprecated Use provenance.rowNumber for multi-source workflows. */
  row: number;
  field?: CanonicalField;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  originalValue?: unknown;
  proposedValue?: unknown;
}

export type PersonalEmailPolicy = "allow" | "warning" | "block";

export interface ProcessingConfig {
  requiredFields: CanonicalField[];
  personalEmailPolicy: PersonalEmailPolicy;
  contactPreferences?: Partial<ContactPreferences>;
  defaults?: Partial<Omit<CanonicalLead, "recordId" | "provenance" | "sourceRow" | "customFields">>;
}

export interface ProcessingStats {
  totalRows: number;
  uniqueContacts: number;
  readyRows: number;
  reviewRows: number;
  blockedRows: number;
  duplicateRows: number;
  normalizedValues: number;
}

export interface ProcessedDataset {
  leads: CanonicalLead[];
  issues: DataIssue[];
  ready: CanonicalLead[];
  review: CanonicalLead[];
  blocked: CanonicalLead[];
  stats: ProcessingStats;
}
