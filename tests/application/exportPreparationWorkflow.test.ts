import { describe, expect, it } from "vitest";
import {
  availableExportMethods,
  createExportPreparationState,
  preserveCompatibleRuntimeValues,
  restoreRuntimeValues,
  selectExportPreparationMode,
  selectExportTemplate,
} from "../../src/application/exportPreparationWorkflow";
import { createExportTemplateDraft } from "../../src/application/exportTemplates";

describe("prepare export workflow", () => {
  it("offers workbook filling only when a stored workbook is attached", () => {
    const plain = createExportTemplateDraft();
    const attached = createExportTemplateDraft({ workbook: {
      storagePath: "org/template/master.xlsx", originalFileName: "master.xlsx", originalFileType: "xlsx",
      storedFileType: "xlsx", targetSheet: "Import", headerRow: 1, firstDataRow: 2,
    } });
    expect(availableExportMethods(plain)).toEqual(["generate"]);
    expect(availableExportMethods(attached)).toEqual(["generate", "fill-workbook"]);
  });

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
    expect(customMode.custom.draft.columns).toHaveLength(initial.custom.draft.columns.length + 1);
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

  it("preserves only runtime values with a safe matching field identity when changing templates", () => {
    const previous = createExportTemplateDraft({ columns: [
      { id: "campaign", header: "Campaign", source: { kind: "fixed" } },
      { id: "channel", header: "Channel", source: { kind: "parameter", key: "channel", label: "Channel" } },
    ] });
    const next = createExportTemplateDraft({ columns: [
      { id: "campaign", header: "Campaign ID", source: { kind: "fixed" } },
      { id: "different", header: "Region", source: { kind: "fixed" } },
      { id: "new-channel", header: "Channel", source: { kind: "parameter", key: "channel", label: "Channel" } },
    ] });

    expect(preserveCompatibleRuntimeValues(previous, { campaign: "701xx", channel: "Event" }, next)).toEqual({ campaign: "701xx", channel: "Event" });
  });

  it("restores only values that still belong to a template runtime field", () => {
    const template = createExportTemplateDraft({ columns: [
      { id: "import-name", header: "Import name", source: { kind: "fixed" } },
      { id: "mapped", header: "Email", source: { kind: "canonical", field: "email" } },
    ] });
    expect(restoreRuntimeValues(template, { "import-name": "August import", mapped: "do not keep" })).toEqual({ "import-name": "August import" });
  });
});
