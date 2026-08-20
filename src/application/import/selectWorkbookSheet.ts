import { suggestColumnMapping } from "../../core/mapping/suggestColumnMapping";

const REQUIRED_LEAD_FIELDS = new Set(["firstName", "lastName", "email", "company"]);

export interface LeadTableEvidence {
  recognizedFieldCount: number;
  requiredFieldCount: number;
  mappingScore: number;
}

export interface WorkbookSheetSelectionCandidate extends LeadTableEvidence {
  index: number;
  rowCount: number;
  columnCount: number;
}

export function evaluateLeadTableColumns(columns: readonly string[]): LeadTableEvidence {
  const plan = suggestColumnMapping(columns);
  const recognizedSuggestions = plan.suggestions.filter(
    (suggestion) => suggestion.decision !== "unmapped",
  );
  const recognizedFields = new Set(
    recognizedSuggestions.flatMap((suggestion) =>
      suggestion.candidates.slice(0, 1).map((candidate) => candidate.field),
    ),
  );

  return {
    recognizedFieldCount: recognizedFields.size,
    requiredFieldCount: [...recognizedFields].filter((field) => REQUIRED_LEAD_FIELDS.has(field)).length,
    mappingScore:
      plan.autoMappedCount * 5
      + plan.reviewCount * 2
      + plan.ambiguousCount,
  };
}

function isBetterCandidate(
  candidate: WorkbookSheetSelectionCandidate,
  current: WorkbookSheetSelectionCandidate,
): boolean {
  if (candidate.requiredFieldCount !== current.requiredFieldCount) {
    return candidate.requiredFieldCount > current.requiredFieldCount;
  }
  if (candidate.mappingScore !== current.mappingScore) {
    return candidate.mappingScore > current.mappingScore;
  }
  if (candidate.recognizedFieldCount !== current.recognizedFieldCount) {
    return candidate.recognizedFieldCount > current.recognizedFieldCount;
  }
  if (candidate.rowCount !== current.rowCount) {
    return candidate.rowCount > current.rowCount;
  }
  if (candidate.columnCount !== current.columnCount) {
    return candidate.columnCount > current.columnCount;
  }
  return candidate.index < current.index;
}

export function selectBestWorkbookSheetIndex(
  candidates: readonly WorkbookSheetSelectionCandidate[],
): number | undefined {
  return candidates.reduce<WorkbookSheetSelectionCandidate | undefined>((best, candidate) => {
    if (!best || isBetterCandidate(candidate, best)) return candidate;
    return best;
  }, undefined)?.index;
}
