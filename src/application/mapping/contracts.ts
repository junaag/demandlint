import type { CanonicalField, ColumnMapping } from "../../core/domain";

export type SourceMapping = ColumnMapping;

export type FieldReference =
  | { kind: "canonical"; field: CanonicalField }
  | { kind: "custom"; key: string };

export interface DestinationFieldMapping {
  source: FieldReference;
  destinationField: string;
  required?: boolean;
}

export interface DestinationMapping {
  destinationType: string;
  fields: DestinationFieldMapping[];
}

export interface MappingTemplate {
  id: string;
  name: string;
  organizationId?: string;
  sourceMapping: SourceMapping;
  destinationMapping?: DestinationMapping;
  sourceSignature?: string[];
}
