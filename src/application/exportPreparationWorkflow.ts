import type { DataExportFormat } from "./exportFileName";
import {
  cloneExportTemplate,
  copyExportTemplate,
  createExportTemplateDraft,
  exportRuntimeColumns,
  exportRuntimeValueIdentity,
  exportRuntimeValueKey,
  type ExportParameterValues,
  type ExportTemplate,
} from "./exportTemplates";

export type ExportPreparationMode = "custom" | "template";

export interface ExportPreparationDraft {
  draft: ExportTemplate;
  format: DataExportFormat;
  parameters: ExportParameterValues;
}

export interface ExportPreparationState {
  mode: ExportPreparationMode;
  custom: ExportPreparationDraft;
  template: ExportPreparationDraft;
}

export function createCustomExportDraft(startingTemplate: ExportTemplate): ExportTemplate {
  return cloneExportTemplate(startingTemplate, {
    id: "custom-export",
    name: "Custom export",
    destinationType: "Custom destination",
    sheetName: "Export",
    builtIn: false,
  });
}

export function createExportPreparationState(startingTemplate: ExportTemplate = createExportTemplateDraft()): ExportPreparationState {
  const custom = createCustomExportDraft(startingTemplate);
  const template = cloneExportTemplate(startingTemplate, {
    id: startingTemplate.id,
    ...(startingTemplate.builtIn !== undefined ? { builtIn: startingTemplate.builtIn } : {}),
  });
  return {
    mode: "custom",
    custom: { draft: custom, format: custom.defaultFormat, parameters: {} },
    template: { draft: template, format: template.defaultFormat, parameters: {} },
  };
}

export function selectExportPreparationMode(
  state: ExportPreparationState,
  mode: ExportPreparationMode,
): ExportPreparationState {
  return { ...state, mode };
}

export function selectExportTemplate(
  state: ExportPreparationState,
  template: ExportTemplate,
): ExportPreparationState {
  // Preserve saved column ids: they are the stable field identity for runtime
  // values and validation dependencies. The draft still has its own objects.
  const draft = copyExportTemplate(template, { id: template.id, builtIn: false });
  return {
    ...state,
    template: {
      draft,
      format: draft.defaultFormat,
      parameters: preserveCompatibleRuntimeValues(state.template.draft, state.template.parameters, draft),
    },
  };
}

export function restoreRuntimeValues(template: ExportTemplate, values: ExportParameterValues): ExportParameterValues {
  const allowed = new Set(exportRuntimeColumns(template).map(exportRuntimeValueKey));
  return Object.fromEntries(Object.entries(values).filter(([key]) => allowed.has(key)));
}

export function preserveCompatibleRuntimeValues(
  previousTemplate: ExportTemplate,
  previousValues: ExportParameterValues,
  nextTemplate: ExportTemplate,
): ExportParameterValues {
  const previous = new Map(exportRuntimeColumns(previousTemplate).map((column) => [
    exportRuntimeValueIdentity(column), exportRuntimeValueKey(column),
  ]));
  return Object.fromEntries(exportRuntimeColumns(nextTemplate).flatMap((column) => {
    const previousKey = previous.get(exportRuntimeValueIdentity(column));
    const value = previousKey === undefined ? undefined : previousValues[previousKey];
    return value === undefined ? [] : [[exportRuntimeValueKey(column), value]];
  }));
}
