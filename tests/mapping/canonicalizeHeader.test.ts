import { describe, expect, it } from "vitest";
import { canonicalizeHeader, headerTokens } from "../../src/core/mapping/canonicalizeHeader";

describe("canonicalizeHeader", () => {
  it("normalizes accents, casing, punctuation and whitespace", () => {
    expect(canonicalizeHeader("  Numéro-de_TÉLÉPHONE  ")).toBe("numero de telephone");
  });

  it("normalizes common separators consistently", () => {
    expect(canonicalizeHeader("Country / Region")).toBe("country region");
    expect(canonicalizeHeader("First.Name")).toBe("first name");
    expect(canonicalizeHeader("Sales & Marketing")).toBe("sales and marketing");
  });

  it("returns stable header tokens", () => {
    expect(headerTokens("  Business   Email Address ")).toEqual([
      "business",
      "email",
      "address",
    ]);
  });
});
