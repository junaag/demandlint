import type { CanonicalField, ColumnMapping } from "../domain";

export type MappingConfidence = "high" | "medium" | "low";

export type MappingDecision = "auto" | "review" | "ambiguous" | "unmapped";

export type MappingMatchReason =
  | "canonical-name"
  | "exact-alias"
  | "alias-contained"
  | "keyword";

export interface MappingCandidate {
  field: CanonicalField;
  confidence: MappingConfidence;
  score: number;
  reason: MappingMatchReason;
  matchedAlias: string;
}

export interface ColumnMappingSuggestion {
  sourceColumn: string;
  normalizedHeader: string;
  decision: MappingDecision;
  candidates: MappingCandidate[];
  selectedField?: CanonicalField;
  explanation: string;
}

export interface MappingPlan {
  suggestions: ColumnMappingSuggestion[];
  autoMapping: Partial<ColumnMapping>;
  autoMappedCount: number;
  reviewCount: number;
  ambiguousCount: number;
  unmappedCount: number;
}

export type MappingSynonymDictionary = Record<CanonicalField, readonly string[]>;
