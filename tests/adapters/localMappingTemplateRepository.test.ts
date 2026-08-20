import { describe, expect, it } from "vitest";
import { LocalMappingTemplateRepository } from "../../src/adapters/browser/localMappingTemplateRepository";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("local mapping template repository", () => {
  it("isolates templates by organization and supports deletion", async () => {
    const repository = new LocalMappingTemplateRepository(new MemoryStorage());
    await repository.save({
      id: "template-a",
      name: "Cvent France",
      organizationId: "org-fr",
      sourceMapping: { Email: { kind: "canonical", field: "email" } },
      sourceSignature: ["Email"],
    });
    await repository.save({
      id: "template-b",
      name: "Cvent Spain",
      organizationId: "org-es",
      sourceMapping: { Correo: { kind: "canonical", field: "email" } },
      sourceSignature: ["Correo"],
    });

    expect(await repository.listForOrganization("org-fr")).toHaveLength(1);
    expect((await repository.getById("template-b"))?.name).toBe("Cvent Spain");
    await repository.delete("template-a");
    expect(await repository.listForOrganization("org-fr")).toEqual([]);
  });
});
