import type {
  ExportTemplate,
  ExportTemplateWorkbook,
  ExportTemplateWorkbookSourceType,
} from "./exportTemplates";

export interface ExportTemplateWorkbookAttachmentInput {
  bytes: Uint8Array;
  originalFileName: string;
  originalFileType: ExportTemplateWorkbookSourceType;
  targetSheet: string;
  headerRow: number;
  firstDataRow: number;
}

export type ExportTemplateWorkbookChange =
  | { kind: "attach"; workbook: ExportTemplateWorkbookAttachmentInput }
  | { kind: "detach" };

export interface StoredWorkbookUpload extends ExportTemplateWorkbookAttachmentInput {
  organizationId: string;
  templateId: string;
}

export interface ExportTemplateWorkbookStore {
  save(input: StoredWorkbookUpload): Promise<ExportTemplateWorkbook>;
  download(workbook: ExportTemplateWorkbook): Promise<Uint8Array>;
  delete(workbook: ExportTemplateWorkbook): Promise<void>;
}

function normalizedHeader(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function workbookHeaderCompatibility(
  template: ExportTemplate,
  workbookHeaders: readonly string[],
): string[] {
  const issues: string[] = [];
  const available = new Map<string, number>();
  for (const header of workbookHeaders) {
    const normalized = normalizedHeader(header);
    if (!normalized) continue;
    available.set(normalized, (available.get(normalized) ?? 0) + 1);
  }

  for (const column of template.columns) {
    const header = column.header.trim();
    if (!header) continue;
    const count = available.get(normalizedHeader(header)) ?? 0;
    if (count === 0) issues.push(`Column '${header}' is missing from the workbook.`);
    if (count > 1) issues.push(`Column '${header}' appears more than once in the workbook.`);
  }
  return issues;
}

export function assertWorkbookCoordinates(headerRow: number, firstDataRow: number): void {
  if (!Number.isInteger(headerRow) || headerRow < 1) throw new Error("Header row must be a positive row number.");
  if (!Number.isInteger(firstDataRow) || firstDataRow <= headerRow) {
    throw new Error("First data row must be below the header row.");
  }
}
