import { localExportRuntimeValueRepository } from "../adapters/browser/localExportRuntimeValueRepository";
import type { ExportParameterValues } from "../application/exportTemplates";

export function loadBrowserExportRuntimeValues(templateId: string): ExportParameterValues {
  return localExportRuntimeValueRepository.read(templateId);
}

export function saveBrowserExportRuntimeValues(templateId: string, values: ExportParameterValues): void {
  localExportRuntimeValueRepository.save(templateId, values);
}
