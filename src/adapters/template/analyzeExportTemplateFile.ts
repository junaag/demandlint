import Papa, { type ParseError } from "papaparse";
import type {
  ExportTemplateDelimiter,
  ExportTemplateFileAnalysis,
  ExportTemplateFileSheet,
  ExportTemplateFileType,
  ExportTemplateHeaderRow,
} from "../../application/exportTemplateFileImport";
import type { ExportValidationRule } from "../../application/exportTemplates";
import type { LocalTableFile } from "../table/domain";

type TemplateCell = string | number | boolean | Date | null | undefined;
type TemplateRow = TemplateCell[];

type ColumnValidations = Record<number, { rules: ExportValidationRule[]; warnings?: string[] }>;

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

function analyzeSheet(name: string, index: number, sourceRows: TemplateRow[], columnValidations?: ColumnValidations): ExportTemplateFileSheet {
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
    ...(columnValidations && Object.keys(columnValidations).length > 0 ? { columnValidations } : {}),
  };
}

function decodeEntities(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function columnIndexFromReference(reference: string): number | undefined {
  const match = reference.match(/\$?([A-Z]{1,3})\$?\d+/i);
  if (!match) return undefined;
  return [...match[1]!.toUpperCase()].reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function columnsFromSqref(sqref: string, XLSX: typeof import("xlsx")): number[] {
  const columns = new Set<number>();
  for (const reference of sqref.trim().split(/\s+/)) {
    try {
      const range = XLSX.utils.decode_range(reference);
      for (let column = range.s.c; column <= range.e.c; column += 1) columns.add(column);
    } catch {
      const column = columnIndexFromReference(reference);
      if (column !== undefined) columns.add(column);
    }
  }
  return [...columns];
}

function workbookXmlParts(XLSX: typeof import("xlsx"), bytes: Uint8Array): Map<string, string> {
  const parts = new Map<string, string>();
  try {
    const cfb = (XLSX as unknown as { CFB: { read(data: Uint8Array, options: { type: string }): { FullPaths?: string[] }; find(cfb: unknown, path: string): { content?: Uint8Array } | undefined } }).CFB.read(bytes, { type: "array" });
    for (const path of cfb.FullPaths ?? []) {
      if (!/^Root Entry\/xl\/worksheets\/sheet\d+\.xml$/i.test(path)) continue;
      const entry = (XLSX as unknown as { CFB: { find(cfb: unknown, path: string): { content?: Uint8Array } | undefined } }).CFB.find(cfb, path);
      if (entry?.content) parts.set(path.replace(/^Root Entry\/xl\/worksheets\//i, ""), new TextDecoder().decode(entry.content));
    }
  } catch {
    // SheetJS's workbook values are still usable; validation extraction will surface no invented rules.
  }
  return parts;
}

function namedReferences(workbook: import("xlsx").WorkBook): Map<string, string> {
  return new Map((workbook.Workbook?.Names ?? []).flatMap((name) => name.Name && name.Ref ? [[name.Name, name.Ref] as const] : []));
}

function referenceValues(
  reference: string,
  workbook: import("xlsx").WorkBook,
  currentSheet: string,
  XLSX: typeof import("xlsx"),
): string[] | undefined {
  const cleaned = decodeEntities(reference).replace(/^=/, "").trim();
  const quoted = cleaned.match(/^"([\s\S]*)"$/);
  if (quoted) return quoted[1]!.split(",").map((value) => value.trim());
  const parts = cleaned.match(/^(?:'([^']+)'|([^!]+))!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/i)
    ?? cleaned.match(/^\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/i);
  if (!parts) return undefined;
  const hasSheet = cleaned.includes("!");
  const sheetName = hasSheet ? (parts[1] ?? parts[2]) : currentSheet;
  const columnStart = hasSheet ? parts[3] : parts[1];
  const rowStart = hasSheet ? parts[4] : parts[2];
  const columnEnd = hasSheet ? (parts[5] ?? columnStart) : (parts[3] ?? columnStart);
  const rowEnd = hasSheet ? (parts[6] ?? rowStart) : (parts[4] ?? rowStart);
  const sheet = workbook.Sheets[sheetName!];
  if (!sheet) return undefined;
  const range = XLSX.utils.decode_range(`${columnStart}${rowStart}:${columnEnd}${rowEnd}`);
  const rows = XLSX.utils.sheet_to_json<Array<unknown>>(sheet, { header: 1, raw: true, defval: null, blankrows: true });
  const values: string[] = [];
  for (let row = range.s.r; row <= range.e.r; row += 1) for (let column = range.s.c; column <= range.e.c; column += 1) {
    const value = rows[row]?.[column] ?? sheet[XLSX.utils.encode_cell({ r: row, c: column })]?.v;
    if (value !== undefined && value !== null && String(value).trim()) values.push(String(value));
  }
  return values;
}

interface RawValidation { sqref: string; formula: string; type?: string }

function rawValidations(xml: string): RawValidation[] {
  const result: RawValidation[] = [];
  const validationPattern = /<(?:\w+:)?dataValidation\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?dataValidation>/gi;
  for (const match of xml.matchAll(validationPattern)) {
    const attributes = match[1] ?? "";
    const body = match[2] ?? "";
    const sqref = attributes.match(/\bsqref="([^"]+)"/)?.[1] ?? body.match(/<(?:\w+:)?sqref>([^<]+)</i)?.[1];
    // Newer Excel writes x14 list validations as x14:formula1/xm:f. Their
    // nested XML must be unwrapped before a defined name or range can resolve.
    const formulaMarkup = body.match(/<(?:\w+:)?formula1>([\s\S]*?)<\/(?:\w+:)?formula1>/i)?.[1]
      ?? body.match(/<(?:\w+:)?f>([\s\S]*?)<\/(?:\w+:)?f>/i)?.[1];
    const formula = formulaMarkup?.replace(/<[^>]+>/g, "").trim();
    const type = attributes.match(/\btype="([^"]+)"/)?.[1];
    if (sqref && formula) result.push(type ? { sqref, formula: formula.trim(), type } : { sqref, formula: formula.trim() });
  }
  return result;
}

function normalizeWorkbookValidations(
  workbook: import("xlsx").WorkBook,
  bytes: Uint8Array,
  XLSX: typeof import("xlsx"),
): Map<string, ColumnValidations> {
  const names = namedReferences(workbook);
  const valuesForFormula = (formula: string, sheetName: string) => referenceValues(names.get(formula.replace(/^=/, "")) ?? formula, workbook, sheetName, XLSX);
  const result = new Map<string, ColumnValidations>();
  const xmlByPart = workbookXmlParts(XLSX, bytes);
  workbook.SheetNames.forEach((sheetName, index) => {
    const xml = xmlByPart.get(`sheet${index + 1}.xml`);
    if (!xml) return;
    const target: ColumnValidations = {};
    const parentAllowed = new Map<number, string[]>();
    const pending: Array<{ columns: number[]; formula: string }> = [];
    for (const validation of rawValidations(xml)) {
      const columns = columnsFromSqref(validation.sqref, XLSX);
      if (validation.type && validation.type !== "list") {
        for (const column of columns) target[column] = { rules: [], warnings: ["Source validation needs review; this Excel validation type is not supported."] };
        continue;
      }
      if (/\bINDIRECT\s*\(/i.test(validation.formula)) {
        pending.push({ columns, formula: validation.formula });
        continue;
      }
      const values = valuesForFormula(validation.formula, sheetName);
      for (const column of columns) {
        if (!values) target[column] = { rules: [], warnings: ["Source validation needs review; this list formula could not be resolved."] };
        else {
          target[column] = { rules: [{ kind: "allowedValues", outcome: "block", values }] };
          parentAllowed.set(column, values);
        }
      }
    }
    for (const dependent of pending) {
      const parentColumn = columnIndexFromReference(dependent.formula);
      if (parentColumn === undefined) {
        for (const column of dependent.columns) target[column] = { rules: [], warnings: ["Source validation needs review; this dependent list could not be resolved."] };
        continue;
      }
      const parentValues = parentAllowed.get(parentColumn) ?? [];
      const cases: Record<string, string[]> = {};
      for (const parentValue of parentValues) {
        const key = parentValue.replace(/[^A-Za-z0-9_]/g, "_");
        const values = valuesForFormula(`=${key}`, sheetName);
        if (values) cases[parentValue] = values;
      }
      for (const column of dependent.columns) {
        if (Object.keys(cases).length === 0) target[column] = { rules: [], warnings: ["Source validation needs review; this dependent list could not be resolved."] };
        else target[column] = { rules: [{ kind: "dependentAllowedValues", outcome: "block", parentColumnId: `__column_${parentColumn}`, cases }] };
      }
    }
    if (Object.keys(target).length > 0) result.set(sheetName, target);
  });
  return result;
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
    const validations = sourceType === "xlsx" ? normalizeWorkbookValidations(workbook, file.bytes, XLSX) : new Map<string, ColumnValidations>();
    sheets = workbook.SheetNames.map((name, index) => {
      const rows = XLSX.utils.sheet_to_json<TemplateRow>(workbook.Sheets[name]!, {
        header: 1,
        raw: true,
        defval: null,
        blankrows: true,
      });
      return analyzeSheet(name, index, rows, validations.get(name));
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
