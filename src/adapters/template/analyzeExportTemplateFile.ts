import Papa, { type ParseError } from "papaparse";
import type {
  ExportTemplateDelimiter,
  ExportTemplateFileAnalysis,
  ExportTemplateFileSheet,
  ExportTemplateFileType,
  ExportTemplateHeaderRow,
} from "../../application/exportTemplateFileImport";
import type { LocalTableFile } from "../table/domain";

type TemplateCell = string | number | boolean | Date | null | undefined;
type TemplateRow = TemplateCell[];

const MAX_HEADER_SCAN_ROWS = 25;
const MAX_HEADER_OPTIONS = 8;

function fileType(fileName: string): ExportTemplateFileType {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "csv" || extension === "xlsx" || extension === "xls") return extension;
  throw new Error("Import a CSV, XLSX or XLS template file.");
}

function templateName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.(csv|xlsx|xls)$/i, "").trim();
  return withoutExtension || "Imported template";
}

function cellText(cell: TemplateCell): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString();
  return String(cell);
}

function meaningfulCell(cell: TemplateCell): boolean {
  return cellText(cell).trim().length > 0;
}

function meaningfulRow(row: TemplateRow): boolean {
  return row.some(meaningfulCell);
}

function actualColumnCount(rows: TemplateRow[]): number {
  return rows.reduce((maximum, row) => {
    let lastMeaningfulIndex = -1;
    row.forEach((cell, index) => {
      if (meaningfulCell(cell)) lastMeaningfulIndex = index;
    });
    return Math.max(maximum, lastMeaningfulIndex + 1);
  }, 0);
}

function headerRow(row: TemplateRow, rowNumber: number, columnCount: number): ExportTemplateHeaderRow {
  const headers = Array.from({ length: columnCount }, (_, index) => cellText(row[index]));
  return {
    rowNumber,
    headers,
    nonEmptyCount: headers.filter((header) => header.trim().length > 0).length,
  };
}

function hasDuplicateHeaders(row: ExportTemplateHeaderRow): boolean {
  const headers = row.headers.map((header) => header.trim().toLocaleLowerCase()).filter(Boolean);
  return new Set(headers).size !== headers.length;
}

function analyzeSheet(name: string, index: number, sourceRows: TemplateRow[]): ExportTemplateFileSheet {
  const rows = sourceRows.map((row) => Array.isArray(row) ? row : []);
  const columnCount = actualColumnCount(rows);
  const meaningfulIndexes = rows
    .slice(0, MAX_HEADER_SCAN_ROWS)
    .map((row, rowIndex) => meaningfulRow(row) ? rowIndex : -1)
    .filter((rowIndex) => rowIndex >= 0);
  const firstMeaningfulIndex = meaningfulIndexes[0];
  const preferredIndex = meaningfulIndexes.find((rowIndex) => (
    rowIndex !== undefined && (rows[rowIndex] ?? []).filter(meaningfulCell).length >= 2
  )) ?? firstMeaningfulIndex;

  if (preferredIndex === undefined || columnCount === 0) {
    return {
      name,
      index,
      rowCount: 0,
      columnCount: 0,
      usable: false,
      headerRows: [],
      requiresHeaderReview: false,
    };
  }

  const optionIndexes = meaningfulIndexes.slice(0, MAX_HEADER_OPTIONS);
  if (!optionIndexes.includes(preferredIndex)) optionIndexes.push(preferredIndex);
  optionIndexes.sort((left, right) => left - right);
  const headerRows = optionIndexes.map((rowIndex) => (
    headerRow(rows[rowIndex] ?? [], rowIndex + 1, columnCount)
  ));
  const preferred = headerRows.find((candidate) => candidate.rowNumber === preferredIndex + 1);
  const rowCount = rows.slice(preferredIndex + 1).filter(meaningfulRow).length;

  return {
    name,
    index,
    rowCount,
    columnCount,
    usable: true,
    headerRows,
    preferredHeaderRowNumber: preferredIndex + 1,
    requiresHeaderReview: preferredIndex !== firstMeaningfulIndex
      || (preferred?.nonEmptyCount ?? 0) < 2
      || (preferred ? hasDuplicateHeaders(preferred) : false),
  };
}

function detectedDelimiter(value: string | undefined): ExportTemplateDelimiter | undefined {
  return value === "," || value === ";" || value === "\t" ? value : undefined;
}

function meaningfulCsvErrors(errors: ParseError[]): ParseError[] {
  return errors.filter((error) => error.code !== "UndetectableDelimiter");
}

function decodeCsv(bytes: Uint8Array): string {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  } catch (error) {
    throw new Error("CSV template file is not valid UTF-8 text.", { cause: error });
  }
}

function analyzeCsv(file: LocalTableFile): ExportTemplateFileAnalysis {
  const text = decodeCsv(file.bytes);
  if (!text.trim()) throw new Error("CSV template file is empty.");
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  });
  const errors = meaningfulCsvErrors(result.errors);
  if (errors.length > 0) throw new Error(`CSV template file could not be parsed: ${errors[0]?.message ?? "unknown error"}`);
  const sheet = analyzeSheet("CSV", 0, result.data);
  if (!sheet.usable) throw new Error("CSV template file does not contain a usable header row.");
  const delimiter = detectedDelimiter(result.meta.delimiter);
  return {
    fileName: file.name,
    templateName: templateName(file.name),
    sourceType: "csv",
    sheets: [sheet],
    selectedSheetName: sheet.name,
    requiresSheetSelection: false,
    ...(delimiter ? { delimiter } : {}),
  };
}

async function analyzeWorkbook(
  file: LocalTableFile,
  sourceType: "xlsx" | "xls",
): Promise<ExportTemplateFileAnalysis> {
  let sheets: ExportTemplateFileSheet[];
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(file.bytes, { type: "array", cellDates: true, dense: true });
    sheets = workbook.SheetNames.map((name, index) => {
      const rows = XLSX.utils.sheet_to_json<TemplateRow>(workbook.Sheets[name]!, {
        header: 1,
        raw: true,
        defval: null,
        blankrows: true,
      });
      return analyzeSheet(name, index, rows);
    });
  } catch (error) {
    throw new Error(`${sourceType.toUpperCase()} template file could not be parsed.`, { cause: error });
  }

  const usableSheets = sheets.filter((sheet) => sheet.usable);
  if (usableSheets.length === 0) {
    throw new Error(`${sourceType.toUpperCase()} template file does not contain a usable worksheet.`);
  }
  return {
    fileName: file.name,
    templateName: templateName(file.name),
    sourceType,
    sheets,
    ...(usableSheets.length === 1 ? { selectedSheetName: usableSheets[0]!.name } : {}),
    requiresSheetSelection: usableSheets.length > 1,
  };
}

export async function analyzeExportTemplateFile(file: LocalTableFile): Promise<ExportTemplateFileAnalysis> {
  if (file.bytes.byteLength === 0) throw new Error("Template file is empty.");
  const sourceType = fileType(file.name);
  return sourceType === "csv" ? analyzeCsv(file) : analyzeWorkbook(file, sourceType);
}
