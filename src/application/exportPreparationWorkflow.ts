import type { DataExportFormat } from "./exportFileName";
import { cloneExportTemplate, type ExportParameterValues, type ExportTemplate } from "./exportTemplates";

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

export function createExportPreparationState(startingTemplate: ExportTemplate): ExportPreparationState {
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
