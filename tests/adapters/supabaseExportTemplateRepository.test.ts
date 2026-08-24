import { describe, expect, it } from "vitest";
import {
  destinationTypeForStorage,
  destinationTypeFromStorage,
} from "../../src/adapters/supabase/supabaseExportTemplateRepository";

describe("SupabaseExportTemplateRepository destination mapping", () => {
  it("stores blank destination values as null", () => {
    expect(destinationTypeForStorage("")).toBeNull();
    expect(destinationTypeForStorage("   ")).toBeNull();
  });

  it("loads null as an empty application value and preserves a non-empty destination", () => {
    expect(destinationTypeFromStorage(null)).toBe("");
    expect(destinationTypeForStorage("CRM")).toBe("CRM");
    expect(destinationTypeFromStorage("CRM")).toBe("CRM");
  });
});
