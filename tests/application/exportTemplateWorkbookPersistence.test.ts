import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { ExportTemplate, ExportTemplateWorkbook } from "../../src/application/exportTemplates";
import type { ExportTemplateRepository } from "../../src/application/ports/exportTemplateRepository";
import type { ExportTemplateWorkbookStore, StoredWorkbookUpload } from "../../src/application/exportTemplateWorkbook";
import { deleteExportTemplateWithWorkbook, persistExportTemplateWithWorkbook } from "../../src/composition/browserExportTemplates";

class MemoryRepository implements ExportTemplateRepository {
  values = new Map<string, ExportTemplate>();
  async listForOrganization(organizationId: string) { return [...this.values.values()].filter((item) => item.organizationId === organizationId); }
  async getById(id: string) { return this.values.get(id) ?? null; }
  async save(template: ExportTemplate) { this.values.set(template.id, structuredClone(template)); }
  async delete(id: string) { this.values.delete(id); }
}

class MemoryWorkbookStore implements ExportTemplateWorkbookStore {
  saved: StoredWorkbookUpload[] = [];
  deleted: string[] = [];
  async save(input: StoredWorkbookUpload): Promise<ExportTemplateWorkbook> {
    this.saved.push(input);
    return { storagePath: `stored/${this.saved.length}.xlsx`, originalFileName: input.originalFileName, originalFileType: input.originalFileType, storedFileType: "xlsx", targetSheet: input.targetSheet, headerRow: input.headerRow, firstDataRow: input.firstDataRow };
  }
  async download() { return new Uint8Array(); }
  async delete(workbook: ExportTemplateWorkbook) { this.deleted.push(workbook.storagePath); }
}

async function workbookBytes(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Import");
  sheet.addRow(["Email"]);
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

const base: ExportTemplate = {
  id: "00000000-0000-4000-8000-000000000001",
  organizationId: "00000000-0000-4000-8000-000000000002",
  name: "Workbook template",
  destinationType: "CRM",
  defaultFormat: "xlsx",
  columns: [{ id: "email", header: "Email", source: { kind: "canonical", field: "email" } }],
};

function attachment(bytes: Uint8Array) {
  return { kind: "attach" as const, workbook: { bytes, originalFileName: "master.xlsx", originalFileType: "xlsx" as const, targetSheet: "Import", headerRow: 1, firstDataRow: 2 } };
}

describe("stored workbook persistence", () => {
  it("attaches, replaces and detaches workbook resources without sharing paths", async () => {
    const repository = new MemoryRepository();
    const store = new MemoryWorkbookStore();
    const bytes = await workbookBytes();
    const attached = await persistExportTemplateWithWorkbook(base, base.organizationId!, attachment(bytes), repository, store);
    expect(attached.workbook?.storagePath).toBe("stored/1.xlsx");
    expect(repository.values.get(base.id)?.workbook).toEqual(attached.workbook);

    const replaced = await persistExportTemplateWithWorkbook(attached, base.organizationId!, attachment(bytes), repository, store);
    expect(replaced.workbook?.storagePath).toBe("stored/2.xlsx");
    expect(store.deleted).toEqual(["stored/1.xlsx"]);

    const detached = await persistExportTemplateWithWorkbook(replaced, base.organizationId!, { kind: "detach" }, repository, store);
    expect(detached.workbook).toBeUndefined();
    expect(repository.values.get(base.id)?.workbook).toBeUndefined();
    expect(store.deleted).toEqual(["stored/1.xlsx", "stored/2.xlsx"]);
  });

  it("cleans up the stored resource when its owning template is deleted", async () => {
    const repository = new MemoryRepository();
    const store = new MemoryWorkbookStore();
    const attached = await persistExportTemplateWithWorkbook(base, base.organizationId!, attachment(await workbookBytes()), repository, store);
    await deleteExportTemplateWithWorkbook(attached.id, repository, store);
    expect(await repository.getById(attached.id)).toBeNull();
    expect(store.deleted).toEqual(["stored/1.xlsx"]);
  });
});
