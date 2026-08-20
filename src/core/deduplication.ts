import type { CanonicalLead, DataIssue, RecordId } from "./domain";

export interface DuplicateResult {
  duplicateRecordIds: Set<RecordId>;
  /** @deprecated Use duplicateRecordIds for multi-source workflows. */
  duplicateRows: Set<number>;
  issues: DataIssue[];
}

export type DuplicateDetectionStrategy = (leads: readonly CanonicalLead[]) => DuplicateResult;

export function detectDuplicates(leads: readonly CanonicalLead[]): DuplicateResult {
  const firstLeadByEmail = new Map<string, CanonicalLead>();
  const duplicateRecordIds = new Set<RecordId>();
  const duplicateRows = new Set<number>();
  const issues: DataIssue[] = [];

  for (const lead of leads) {
    if (!lead.email) continue;

    const firstLead = firstLeadByEmail.get(lead.email);
    if (!firstLead) {
      firstLeadByEmail.set(lead.email, lead);
      continue;
    }

    duplicateRecordIds.add(lead.recordId);
    duplicateRows.add(lead.sourceRow);
    issues.push({
      id: `${lead.recordId}:email:duplicate`,
      recordId: lead.recordId,
      provenance: lead.provenance,
      row: lead.sourceRow,
      field: "email",
      type: "duplicate",
      severity: "warning",
      message: `Duplicate email; first occurrence is ${firstLead.provenance.sourceName} row ${firstLead.provenance.rowNumber}`,
      originalValue: lead.email,
    });
  }

  return { duplicateRecordIds, duplicateRows, issues };
}
