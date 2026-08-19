import { describe, expect, it } from "vitest";
import { candidatesForHeader, suggestColumnMapping } from "../../src/core/mapping/suggestColumnMapping";

describe("deterministic column mapping", () => {
  it("auto-maps common English and French aliases", () => {
    const plan = suggestColumnMapping([
      "Prénom",
      "SURNAME",
      "Organisation",
      "Business Email",
      "Job Role",
      "Téléphone",
      "Pays",
      "Lead Source",
      "Campaign Member Status",
    ]);

    expect(plan.autoMapping).toEqual({
      "Prénom": "firstName",
      SURNAME: "lastName",
      Organisation: "company",
      "Business Email": "email",
      "Job Role": "jobTitle",
      Téléphone: "phone",
      Pays: "country",
      "Lead Source": "leadSource",
      "Campaign Member Status": "campaignMemberStatus",
    });
    expect(plan.autoMappedCount).toBe(9);
    expect(plan.reviewCount).toBe(0);
    expect(plan.ambiguousCount).toBe(0);
    expect(plan.unmappedCount).toBe(0);
  });

  it("treats canonical labels as high confidence", () => {
    const candidates = candidatesForHeader("First Name");

    expect(candidates[0]).toMatchObject({
      field: "firstName",
      confidence: "high",
      reason: "canonical-name",
      score: 110,
    });
  });

  it("requires review for a contained multi-word alias", () => {
    const plan = suggestColumnMapping(["Registrant Business Email Address"]);
    const suggestion = plan.suggestions[0];

    expect(suggestion).toMatchObject({
      decision: "review",
    });
    expect(suggestion?.candidates[0]).toMatchObject({
      field: "email",
      confidence: "medium",
      reason: "alias-contained",
    });
    expect(plan.autoMapping).toEqual({});
  });

  it("requires review for a weak single-keyword match", () => {
    const plan = suggestColumnMapping(["Registrant Company Code"]);
    const suggestion = plan.suggestions[0];

    expect(suggestion).toMatchObject({ decision: "review" });
    expect(suggestion?.candidates[0]).toMatchObject({
      field: "company",
      confidence: "low",
      reason: "keyword",
    });
  });

  it("marks tied candidates as ambiguous rather than guessing", () => {
    const plan = suggestColumnMapping(["Company Email"]);
    const suggestion = plan.suggestions[0];

    expect(suggestion?.decision).toBe("ambiguous");
    expect(suggestion?.selectedField).toBeUndefined();
    expect(suggestion?.candidates.slice(0, 2).map((candidate) => candidate.field).sort()).toEqual([
      "company",
      "email",
    ]);
  });

  it("marks duplicate high-confidence target claims as ambiguous", () => {
    const plan = suggestColumnMapping(["Email", "Business Email"]);

    expect(plan.autoMapping).toEqual({});
    expect(plan.ambiguousCount).toBe(2);
    expect(plan.suggestions.every((suggestion) => suggestion.decision === "ambiguous")).toBe(true);
  });

  it("leaves unknown columns unmapped", () => {
    const plan = suggestColumnMapping(["Booth Scan Comment"]);

    expect(plan.suggestions[0]).toMatchObject({
      decision: "unmapped",
      candidates: [],
    });
    expect(plan.unmappedCount).toBe(1);
    expect(plan.autoMapping).toEqual({});
  });
});
