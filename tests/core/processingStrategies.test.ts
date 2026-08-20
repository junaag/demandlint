import { describe, expect, it } from "vitest";
import type { DataIssue } from "../../src/core/domain";
import { processDataset } from "../../src/core/processDataset";
import { detectDuplicates } from "../../src/core/deduplication";
import { validateLead } from "../../src/core/validation";


describe("processing strategies", () => {
  it("allows a recipe to add validation without branching the core pipeline", () => {
    const result = processDataset(
      [{ FirstName: "Ada", LastName: "Lovelace", Email: "ada@example.com", Company: "Acme" }],
      {
        FirstName: "firstName",
        LastName: "lastName",
        Email: "email",
        Company: "company",
      },
      {
        requiredFields: ["firstName", "lastName", "email", "company"],
        personalEmailPolicy: "allow",
      },
      { id: "source:test", name: "test.csv" },
      {
        validate: (lead, config) => {
          const issues = validateLead(lead, config);
          const companyWarning: DataIssue = {
            id: `${lead.recordId}:company:recipe-warning`,
            recordId: lead.recordId,
            provenance: lead.provenance,
            row: lead.sourceRow,
            field: "company",
            type: "warning",
            severity: "warning",
            message: "Recipe-specific company review",
          };
          return [...issues, companyWarning];
        },
        detectDuplicates,
      },
    );

    expect(result.stats.reviewRows).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ message: "Recipe-specific company review" }),
    );
  });
});
