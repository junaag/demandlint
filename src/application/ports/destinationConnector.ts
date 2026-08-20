import type { CanonicalLead } from "../../core/domain";
import type { DestinationMapping } from "../mapping/contracts";

export interface DestinationSchemaField {
  name: string;
  label: string;
  required?: boolean;
  writable?: boolean;
}

export interface DestinationSchema {
  connectorType: string;
  objectType: string;
  fields: DestinationSchemaField[];
}

export interface DestinationPushResult {
  accepted: number;
  rejected: number;
  errors: Array<{
    recordId: string;
    message: string;
  }>;
}

export interface DestinationConnector {
  readonly type: string;
  testConnection(): Promise<void>;
  getSchema(objectType: string): Promise<DestinationSchema>;
  pushRecords(
    objectType: string,
    records: readonly CanonicalLead[],
    mapping: DestinationMapping,
  ): Promise<DestinationPushResult>;
}
