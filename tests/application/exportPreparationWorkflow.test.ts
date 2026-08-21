import { describe, expect, it } from "vitest";
import {
  createExportPreparationState,
  selectExportPreparationMode,
  selectExportTemplate,
} from "../../src/application/exportPreparationWorkflow";
import { createExportTemplateDraft } from "../../src/application/exportTemplates";

describe("prepare export workflow", () => {
  it("enters the custom path with an independent editable draft", () => {
    const state = createExportPreparationState(createExportTemplateDraft());

    expect(state.mode).toBe("custom");
    expect(state.custom.draft.name).toBe("Custom export");
    expect(state.custom.draft.columns.map((column) => column.header)).toEqual(
      state.template.draft.columns.map((column) => column.header),
    );
    expect(state.custom.draft.columns[0]?.id).not.toBe(state.template.draft.columns[0]?.id);
  });

  it("keeps custom and template configuration, format and prompted values isolated when changing mode", () => {
    const initial = createExportPreparationState(createExportTemplateDraft());
    const custom = {
      ...initial.custom,
      format: "xlsx" as const,
      parameters: { campaign: "Autumn launch" },
      draft: {
        ...initial.custom.draft,
        columns: [...initial.custom.draft.columns, {
          id: "company",
          header: "Company",
          source: { kind: "canonical" as const, field: "company" as const },
        }],
      },
    };
    const template = {
      ...initial.template,
      format: "xls" as const,
      parameters: { campaign: "Template campaign" },
    };
    const templateMode = selectExportPreparationMode({ ...initial, custom, template }, "template");
    const customMode = selectExportPreparationMode(templateMode, "custom");

    expect(templateMode.template.format).toBe("xls");
    expect(templateMode.template.parameters).toEqual({ campaign: "Template campaign" });
    expect(customMode.custom.format).toBe("xlsx");
    expect(customMode.custom.parameters).toEqual({ campaign: "Autumn launch" });
    expect(customMode.custom.draft.columns).toHaveLength(2);
    expect(customMode.template.draft.columns).toHaveLength(initial.template.draft.columns.length);
  });

  it("copies a saved template for one-off export use without mutating it", () => {
    const saved = createExportTemplateDraft({ id: "saved", name: "Events" });
    const selected = selectExportTemplate(createExportPreparationState(), saved);
    selected.template.draft.columns[0]!.header = "One-off email";

    expect(selected.template.draft.id).toBe("saved");
    expect(saved.columns[0]!.header).toBe("Email");
    expect(selected.template.parameters).toEqual({});
  });
});
