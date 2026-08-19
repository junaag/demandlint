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

export interface CanonicalLead {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  country?: string;
  leadSource?: string;
  campaignMemberStatus?: string;
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
  defaults?: Partial<Omit<CanonicalLead, "sourceRow">>;
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
