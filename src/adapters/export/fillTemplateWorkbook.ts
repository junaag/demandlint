import type { CanonicalLead } from "../../core/domain";
import {
  buildTemplateExport,
  type ExportParameterValues,
  type ExportTemplate,
  type ExportTemplateWorkbookSourceType,
  type ExportValue,
} from "../../application/exportTemplates";
import { assertWorkbookCoordinates, workbookHeaderCompatibility } from "../../application/exportTemplateWorkbook";

type ExcelWorkbook = import("exceljs").Workbook;
type ExcelCell = import("exceljs").Cell;

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function loadWorkbook(bytes: Uint8Array): Promise<ExcelWorkbook> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(arrayBuffer(bytes) as import("exceljs").Buffer);
  } catch (error) {
    throw new Error("Workbook template could not be read as XLSX.", { cause: error });
  }
  return workbook;
}

function cellText(cell: ExcelCell): string {
  if (cell.value === null || cell.value === undefined) return "";
  if (typeof cell.value === "object" && "text" in cell.value) return String(cell.value.text ?? "");
  if (typeof cell.value === "object" && "result" in cell.value) return String(cell.value.result ?? "");
  return String(cell.value);
}

function headerColumns(
  workbook: ExcelWorkbook,
  template: ExportTemplate,
): { worksheet: import("exceljs").Worksheet; indexes: number[] } {
  const workbookTemplate = template.workbook;
  if (!workbookTemplate) throw new Error("This export template does not have a stored workbook.");
  assertWorkbookCoordinates(workbookTemplate.headerRow, workbookTemplate.firstDataRow);
  const worksheet = workbook.getWorksheet(workbookTemplate.targetSheet);
  if (!worksheet) throw new Error(`Worksheet '${workbookTemplate.targetSheet}' is missing from the stored workbook.`);
  const row = worksheet.getRow(workbookTemplate.headerRow);
  const headers = Array.from({ length: Math.max(row.cellCount, worksheet.columnCount) }, (_, index) => (
    cellText(row.getCell(index + 1))
  ));
  const compatibility = workbookHeaderCompatibility(template, headers);
  if (compatibility.length > 0) throw new Error(compatibility.join(" "));
  const used = new Set<number>();
  const indexes = template.columns.map((column) => {
    const normalized = column.header.trim().toLocaleLowerCase();
    const index = headers.findIndex((header, candidate) => (
      !used.has(candidate + 1) && header.trim().toLocaleLowerCase() === normalized
    ));
    if (index < 0) throw new Error(`Column '${column.header}' is missing from the stored workbook.`);
    used.add(index + 1);
    return index + 1;
  });
  return { worksheet, indexes };
}

function cloneSerializable<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}

function hasData(cell: ExcelCell): boolean {
  return cell.value !== null && cell.value !== undefined && cellText(cell).trim() !== "";
}

function existingDataEnd(
  worksheet: import("exceljs").Worksheet,
  indexes: readonly number[],
  firstDataRow: number,
): number {
  let end = firstDataRow - 1;
  for (let rowNumber = firstDataRow; rowNumber <= worksheet.actualRowCount; rowNumber += 1) {
    const populated = indexes.some((column) => hasData(worksheet.getCell(rowNumber, column)));
    if (!populated) break;
    end = rowNumber;
  }
  return end;
}

function excelCellValue(value: ExportValue): import("exceljs").CellValue {
  return value as import("exceljs").CellValue;
}

export async function normalizeWorkbookTemplateBytes(
  bytes: Uint8Array,
  sourceType: ExportTemplateWorkbookSourceType,
): Promise<Uint8Array> {
  if (sourceType === "xlsx") {
    await loadWorkbook(bytes);
    return new Uint8Array(arrayBuffer(bytes));
  }
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(bytes, { type: "array", cellDates: true, cellStyles: true });
    const output = XLSX.write(workbook, { type: "array", bookType: "xlsx", cellDates: true, cellStyles: true });
    const normalized = output instanceof Uint8Array ? output : new Uint8Array(output as ArrayBuffer);
    await loadWorkbook(normalized);
    return normalized;
  } catch (error) {
    throw new Error("Legacy XLS workbook could not be normalized to XLSX.", { cause: error });
  }
}

export async function validateWorkbookTemplateBytes(
  bytes: Uint8Array,
  template: ExportTemplate,
): Promise<void> {
  const workbook = await loadWorkbook(bytes);
  headerColumns(workbook, template);
}

export async function fillTemplateWorkbookBytes(
  masterBytes: Uint8Array,
  template: ExportTemplate,
  leads: readonly CanonicalLead[],
  parameters: ExportParameterValues,
): Promise<Uint8Array> {
  const output = buildTemplateExport(template, leads, parameters);
  const blockingIssue = output.issues.find((issue) => issue.outcome !== "review");
  if (blockingIssue) throw new Error(blockingIssue.message);

  const workbook = await loadWorkbook(masterBytes);
  const { worksheet, indexes } = headerColumns(workbook, template);
  const firstDataRow = template.workbook!.firstDataRow;
  const originalActualRowCount = worksheet.actualRowCount;
  const blueprints = indexes.map((column) => {
    const cell = worksheet.getCell(firstDataRow, column);
    return {
      style: cloneSerializable(cell.style),
      dataValidation: cloneSerializable(cell.dataValidation),
      alignment: cloneSerializable(cell.alignment),
      protection: cloneSerializable(cell.protection),
    };
  });
  const lastOldRow = existingDataEnd(worksheet, indexes, firstDataRow);
  const lastNewRow = firstDataRow + output.rows.length - 1;
  const clearThrough = Math.max(lastOldRow, lastNewRow);

  for (let rowNumber = firstDataRow; rowNumber <= clearThrough; rowNumber += 1) {
    indexes.forEach((column) => { worksheet.getCell(rowNumber, column).value = null; });
  }

  output.rows.forEach((row, rowOffset) => {
    indexes.forEach((column, columnOffset) => {
      const cell = worksheet.getCell(firstDataRow + rowOffset, column);
      const blueprint = blueprints[columnOffset]!;
      if (firstDataRow + rowOffset > originalActualRowCount || Object.keys(cell.style).length === 0) cell.style = cloneSerializable(blueprint.style);
      if (!cell.dataValidation?.type && blueprint.dataValidation?.type) cell.dataValidation = cloneSerializable(blueprint.dataValidation);
      if (!cell.alignment && blueprint.alignment) cell.alignment = cloneSerializable(blueprint.alignment);
      if (!cell.protection && blueprint.protection) cell.protection = cloneSerializable(blueprint.protection);
      cell.value = excelCellValue(row[`column_${columnOffset}`] ?? null);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
