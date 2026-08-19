import type { CanonicalLead, DataIssue } from "./domain";

export interface DuplicateResult {
  duplicateRows: Set<number>;
  issues: DataIssue[];
}

export function detectDuplicates(leads: CanonicalLead[]): DuplicateResult {
  const firstRowByEmail = new Map<string, number>();
  const duplicateRows = new Set<number>();
  const issues: DataIssue[] = [];

  for (const lead of leads) {
    if (!lead.email) continue;

    const firstRow = firstRowByEmail.get(lead.email);
    if (firstRow === undefined) {
      firstRowByEmail.set(lead.email, lead.sourceRow);
      continue;
    }

    duplicateRows.add(lead.sourceRow);
    issues.push({
      id: `${lead.sourceRow}:email:duplicate`,
      row: lead.sourceRow,
      field: "email",
      type: "duplicate",
      severity: "warning",
      message: `Duplicate email; first occurrence is row ${firstRow}`,
      originalValue: lead.email,
    });
  }

  return { duplicateRows, issues };
}
