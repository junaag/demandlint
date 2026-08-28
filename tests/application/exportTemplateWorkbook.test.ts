import { describe, expect, it } from "vitest";
import { createExportTemplateDraft } from "../../src/application/exportTemplates";
import { assertWorkbookCoordinates, workbookHeaderCompatibility } from "../../src/application/exportTemplateWorkbook";

describe("export template workbook validation", () => {
  it("keeps valid mappings and reports missing replacement columns without changing them", () => {
    const template = createExportTemplateDraft({ columns: [
      { id: "email", header: "Email", source: { kind: "canonical", field: "email" } },
      { id: "campaign", header: "Campaign", source: { kind: "fixed" } },
    ] });
    const original = structuredClone(template.columns);
    expect(workbookHeaderCompatibility(template, ["Email", "Other"])).toEqual([
      "Column 'Campaign' is missing from the workbook.",
    ]);
    expect(template.columns).toEqual(original);
    expect(workbookHeaderCompatibility(template, ["Campaign", "Email"])).toEqual([]);
  });

  it("requires a data row below a valid header row", () => {
    expect(() => assertWorkbookCoordinates(2, 3)).not.toThrow();
    expect(() => assertWorkbookCoordinates(0, 2)).toThrow("Header row");
    expect(() => assertWorkbookCoordinates(2, 2)).toThrow("First data row");
  });
});
