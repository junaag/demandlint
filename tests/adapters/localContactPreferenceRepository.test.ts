import { describe, expect, it } from "vitest";
import { LocalContactPreferenceRepository } from "../../src/adapters/browser/localContactPreferenceRepository";
import { DEFAULT_CONTACT_PREFERENCES } from "../../src/core/contactPoints";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("local contact preference repository", () => {
  it("stores different priorities for different organizations", async () => {
    const repository = new LocalContactPreferenceRepository(new MemoryStorage());
    await repository.save({
      ...DEFAULT_CONTACT_PREFERENCES,
      phonePriority: ["direct", "mobile", "standard", "other"],
    }, "org-fr");
    await repository.save({
      ...DEFAULT_CONTACT_PREFERENCES,
      defaultPhoneCountry: "ES",
    }, "org-es");

    expect((await repository.load("org-fr")).phonePriority[0]).toBe("direct");
    expect((await repository.load("org-es")).defaultPhoneCountry).toBe("ES");
    expect(await repository.load("org-new")).toEqual(DEFAULT_CONTACT_PREFERENCES);
  });
});
