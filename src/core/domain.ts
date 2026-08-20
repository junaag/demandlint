export type CanonicalField =
  | "firstName"
  | "lastName"
  | "email"
  | "company"
  | "jobTitle"
  | "phone"
  | "country"
  | "leadSource"
  | "campaignMemberStatus";

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
  email?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
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
