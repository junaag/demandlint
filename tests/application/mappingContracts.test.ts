import { describe, expect, it } from "vitest";
import { sourceMappingFromRuntime } from "../../src/application/mapping/contracts";


describe("saved mapping contracts", () => {
  it("converts the current runtime mapping into provider-neutral saved field references", () => {
    const saved = sourceMappingFromRuntime({
      "Business Email": "email",
      Company: "company",
      Notes: "ignore",
    });

    expect(saved).toEqual({
      "Business Email": { kind: "canonical", field: "email" },
      Company: { kind: "canonical", field: "company" },
      Notes: { kind: "ignore" },
    });
  });

  it("allows templates to target future custom fields without changing CanonicalLead", () => {
    const customTarget = { kind: "custom" as const, key: "salesforceCampaignId" };

    expect(customTarget).toEqual({ kind: "custom", key: "salesforceCampaignId" });
  });
});
