import { describe, expect, it } from "vitest";
import { LocalExportTemplateRepository } from "../../src/adapters/browser/localExportTemplateRepository";
import { createExportPreparationState, selectExportPreparationMode, selectExportTemplate } from "../../src/application/exportPreparationWorkflow";
import { createExportTemplateDraftFromFileAnalysis, type ExportTemplateFileAnalysis } from "../../src/application/exportTemplateFileImport";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const analysis: ExportTemplateFileAnalysis = {
  fileName: "crm-upload.csv",
  templateName: "crm-upload",
  sourceType: "csv",
  delimiter: ",",
  selectedSheetName: "CSV",
  requiresSheetSelection: false,
  sheets: [{
    name: "CSV",
    index: 0,
    rowCount: 1,
    columnCount: 2,
    usable: true,
    preferredHeaderRowNumber: 1,
    requiresHeaderReview: false,
    headerRows: [{ rowNumber: 1, headers: ["Email", "Reserved"], nonEmptyCount: 2 }],
  }],
};

describe("imported export template integration", () => {
  it("saves through normal persistence and can be selected in Prepare Export", async () => {
    const repository = new LocalExportTemplateRepository(new MemoryStorage());
    const draft = createExportTemplateDraftFromFileAnalysis(analysis, { organizationId: "org-a" });
    await repository.save(draft);

    const saved = (await repository.listForOrganization("org-a"))[0];
    expect(saved).toEqual(draft);
    const workflow = selectExportTemplate(
      selectExportPreparationMode(createExportPreparationState(), "template"),
      saved!,
    );
    expect(workflow.mode).toBe("template");
    expect(workflow.template.draft.columns.map((column) => column.header)).toEqual(["Email", "Reserved"]);
  });
});
