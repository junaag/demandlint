import type { CanonicalField, ColumnMapping } from "../../core/domain";

export type FieldReference =
  | { kind: "canonical"; field: CanonicalField }
  | { kind: "custom"; key: string };

export type SourceMappingTarget = FieldReference | { kind: "ignore" };
export type SourceMapping = Record<string, SourceMappingTarget>;

export function sourceMappingFromRuntime(mapping: ColumnMapping): SourceMapping {
  return Object.fromEntries(
    Object.entries(mapping).map(([sourceColumn, target]) => [
      sourceColumn,
      target === "ignore"
        ? { kind: "ignore" as const }
        : { kind: "canonical" as const, field: target },
    ]),
  );
}

export function runtimeMappingFromSourceMapping(mapping: SourceMapping): ColumnMapping {
  return Object.fromEntries(
    Object.entries(mapping).map(([sourceColumn, target]) => [
      sourceColumn,
      target.kind === "canonical" ? target.field : "ignore",
    ]),
  );
}

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
