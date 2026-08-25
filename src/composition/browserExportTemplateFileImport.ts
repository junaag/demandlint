import { analyzeExportTemplateFile } from "../adapters/template/analyzeExportTemplateFile";
import { readBrowserFile } from "../adapters/browser/readBrowserFile";
import type { ExportTemplateFileAnalysis } from "../application/exportTemplateFileImport";

export async function analyzeBrowserExportTemplateFile(file: File): Promise<ExportTemplateFileAnalysis> {
  return analyzeExportTemplateFile(await readBrowserFile(file));
}
