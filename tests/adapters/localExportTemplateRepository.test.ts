import { describe, expect, it } from "vitest";
import { LocalExportTemplateRepository } from "../../src/adapters/browser/localExportTemplateRepository";
import type { ExportTemplate } from "../../src/application/exportTemplates";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  raw(key: string) { return this.values.get(key); }
}

const template: ExportTemplate = {
  id: "one",
  organizationId: "org-a",
  name: "Event import",
  destinationType: "Events platform",
  defaultFormat: "csv",
  columns: [{ id: "email", header: "Email", source: { kind: "canonical", field: "email" }, validationRules: [{ kind: "allowedValues", outcome: "block", values: ["a@example.test"] }] }],
};

describe("local export template repository", () => {
  it("isolates, updates and deletes workspace templates", async () => {
    const repository = new LocalExportTemplateRepository(new MemoryStorage());
    await repository.save(template);
    await repository.save({ ...template, name: "Event import v2" });
    await repository.save({ ...template, id: "two", organizationId: "org-b" });
    expect(await repository.listForOrganization("org-a")).toHaveLength(1);
    expect((await repository.getById("one"))?.name).toBe("Event import v2");
    expect((await repository.getById("one"))?.columns[0]?.validationRules?.[0]).toEqual({ kind: "allowedValues", outcome: "block", values: ["a@example.test"] });
    await repository.delete("one");
    expect(await repository.listForOrganization("org-a")).toEqual([]);
  });

  it("keeps legacy templates readable and removes legacy runtime values when saved", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalExportTemplateRepository(storage);
    const legacy = { ...template, id: "legacy", columns: [{ id: "campaign", header: "Campaign ID", source: { kind: "fixed" as const, value: "701xx" }, required: true }] };
    storage.setItem("demandlint.export-templates.v1", JSON.stringify([legacy]));
    expect((await repository.getById("legacy"))?.columns[0]?.source).toEqual({ kind: "fixed", value: "701xx" });
    await repository.save(legacy);
    const stored = storage.raw("demandlint.export-templates.v1") ?? "";
    expect(stored).not.toContain("701xx");
    expect((await repository.getById("legacy"))?.columns[0]?.source).toEqual({ kind: "fixed" });
  });
});
