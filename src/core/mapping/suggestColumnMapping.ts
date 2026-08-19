import type { CanonicalField, ColumnMapping } from "../domain";
import { canonicalizeHeader, headerTokens } from "./canonicalizeHeader";
import type {
  ColumnMappingSuggestion,
  MappingCandidate,
  MappingPlan,
  MappingSynonymDictionary,
} from "./domain";
import { CANONICAL_FIELD_LABELS, DEFAULT_MAPPING_SYNONYMS } from "./synonyms";

const CANONICAL_FIELDS = Object.keys(CANONICAL_FIELD_LABELS) as CanonicalField[];

function confidenceRank(confidence: MappingCandidate["confidence"]): number {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;
  return 1;
}

function isBetterCandidate(candidate: MappingCandidate, current: MappingCandidate): boolean {
  if (candidate.score !== current.score) return candidate.score > current.score;
  return confidenceRank(candidate.confidence) > confidenceRank(current.confidence);
}

function tokensContained(alias: string, sourceTokens: Set<string>): boolean {
  const aliasTokens = headerTokens(alias);
  return aliasTokens.length > 0 && aliasTokens.every((token) => sourceTokens.has(token));
}

function candidateForAlias(
  sourceHeader: string,
  field: CanonicalField,
  alias: string,
  canonicalLabel: string,
): MappingCandidate | undefined {
  const normalizedSource = canonicalizeHeader(sourceHeader);
  const normalizedAlias = canonicalizeHeader(alias);
  const normalizedCanonical = canonicalizeHeader(canonicalLabel);

  if (normalizedSource.length === 0 || normalizedAlias.length === 0) return undefined;

  if (normalizedSource === normalizedCanonical && normalizedAlias === normalizedCanonical) {
    return {
      field,
      confidence: "high",
      score: 110,
      reason: "canonical-name",
      matchedAlias: canonicalLabel,
    };
  }

  if (normalizedSource === normalizedAlias) {
    return {
      field,
      confidence: "high",
      score: 100,
      reason: "exact-alias",
      matchedAlias: alias,
    };
  }

  const sourceTokens = new Set(headerTokens(normalizedSource));
  const aliasTokens = headerTokens(normalizedAlias);
  if (!tokensContained(normalizedAlias, sourceTokens)) return undefined;

  if (aliasTokens.length >= 2) {
    return {
      field,
      confidence: "medium",
      score: 70 + Math.min(aliasTokens.length, 9),
      reason: "alias-contained",
      matchedAlias: alias,
    };
  }

  return {
    field,
    confidence: "low",
    score: 40,
    reason: "keyword",
    matchedAlias: alias,
  };
}

export function candidatesForHeader(
  sourceHeader: string,
  dictionary: MappingSynonymDictionary = DEFAULT_MAPPING_SYNONYMS,
): MappingCandidate[] {
  const bestByField = new Map<CanonicalField, MappingCandidate>();

  for (const field of CANONICAL_FIELDS) {
    const canonicalLabel = CANONICAL_FIELD_LABELS[field];
    const aliases = [canonicalLabel, ...dictionary[field]];

    for (const alias of aliases) {
      const candidate = candidateForAlias(sourceHeader, field, alias, canonicalLabel);
      if (!candidate) continue;

      const current = bestByField.get(field);
      if (!current || isBetterCandidate(candidate, current)) {
        bestByField.set(field, candidate);
      }
    }
  }

  return [...bestByField.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.field.localeCompare(b.field);
  });
}

function suggestionForColumn(
  sourceColumn: string,
  dictionary: MappingSynonymDictionary,
): ColumnMappingSuggestion {
  const normalizedHeader = canonicalizeHeader(sourceColumn);
  const candidates = candidatesForHeader(sourceColumn, dictionary);

  if (candidates.length === 0) {
    return {
      sourceColumn,
      normalizedHeader,
      decision: "unmapped",
      candidates,
      explanation: "No reliable canonical field match was found.",
    };
  }

  const top = candidates[0];
  if (!top) {
    throw new Error("Mapping candidate invariant violated.");
  }

  const tiedTopCandidates = candidates.filter((candidate) => candidate.score === top.score);
  if (tiedTopCandidates.length > 1) {
    return {
      sourceColumn,
      normalizedHeader,
      decision: "ambiguous",
      candidates,
      explanation: `Multiple fields have the same best score: ${tiedTopCandidates
        .map((candidate) => candidate.field)
        .join(", ")}.`,
    };
  }

  if (top.confidence === "high") {
    return {
      sourceColumn,
      normalizedHeader,
      decision: "auto",
      candidates,
      selectedField: top.field,
      explanation: `High-confidence match to ${top.field} via ${top.reason}.`,
    };
  }

  return {
    sourceColumn,
    normalizedHeader,
    decision: "review",
    candidates,
    explanation: `${top.confidence === "medium" ? "Medium" : "Low"}-confidence suggestion for ${top.field}; user confirmation is required.`,
  };
}

function resolveDuplicateAutoTargets(
  suggestions: ColumnMappingSuggestion[],
): ColumnMappingSuggestion[] {
  const claims = new Map<CanonicalField, number[]>();

  suggestions.forEach((suggestion, index) => {
    if (suggestion.decision !== "auto" || !suggestion.selectedField) return;
    const indexes = claims.get(suggestion.selectedField) ?? [];
    indexes.push(index);
    claims.set(suggestion.selectedField, indexes);
  });

  const conflictedIndexes = new Set<number>();
  for (const indexes of claims.values()) {
    if (indexes.length > 1) {
      indexes.forEach((index) => conflictedIndexes.add(index));
    }
  }

  return suggestions.map((suggestion, index) => {
    if (!conflictedIndexes.has(index) || !suggestion.selectedField) return suggestion;

    return {
      sourceColumn: suggestion.sourceColumn,
      normalizedHeader: suggestion.normalizedHeader,
      decision: "ambiguous",
      candidates: suggestion.candidates,
      explanation: `Multiple source columns claim the canonical field ${suggestion.selectedField}; user selection is required.`,
    };
  });
}

export function suggestColumnMapping(
  sourceColumns: readonly string[],
  dictionary: MappingSynonymDictionary = DEFAULT_MAPPING_SYNONYMS,
): MappingPlan {
  const initial = sourceColumns.map((column) => suggestionForColumn(column, dictionary));
  const suggestions = resolveDuplicateAutoTargets(initial);
  const autoMapping: Partial<ColumnMapping> = {};

  for (const suggestion of suggestions) {
    if (suggestion.decision === "auto" && suggestion.selectedField) {
      autoMapping[suggestion.sourceColumn] = suggestion.selectedField;
    }
  }

  return {
    suggestions,
    autoMapping,
    autoMappedCount: suggestions.filter((suggestion) => suggestion.decision === "auto").length,
    reviewCount: suggestions.filter((suggestion) => suggestion.decision === "review").length,
    ambiguousCount: suggestions.filter((suggestion) => suggestion.decision === "ambiguous").length,
    unmappedCount: suggestions.filter((suggestion) => suggestion.decision === "unmapped").length,
  };
}
