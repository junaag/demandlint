import { describe, expect, it } from "vitest";
import { LocalExportTemplateRepository } from "../../src/adapters/browser/localExportTemplateRepository";
import type { ExportTemplate } from "../../src/application/exportTemplates";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const template: ExportTemplate = {
  id: "one",
  organizationId: "org-a",
  name: "Salesforce",
  destinationType: "Salesforce",
  defaultFormat: "csv",
  columns: [{ id: "email", header: "Email", source: { kind: "canonical", field: "email" } }],
};

describe("local export template repository", () => {
  it("isolates, updates and deletes workspace templates", async () => {
    const repository = new LocalExportTemplateRepository(new MemoryStorage());
    await repository.save(template);
    await repository.save({ ...template, name: "Salesforce Leads" });
    await repository.save({ ...template, id: "two", organizationId: "org-b" });
    expect(await repository.listForOrganization("org-a")).toHaveLength(1);
    expect((await repository.getById("one"))?.name).toBe("Salesforce Leads");
    await repository.delete("one");
    expect(await repository.listForOrganization("org-a")).toEqual([]);
  });
});
