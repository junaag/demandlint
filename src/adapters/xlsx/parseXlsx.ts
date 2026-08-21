import {
  evaluateLeadTableColumns,
  selectBestWorkbookSheetIndex,
} from "../../application/import/selectWorkbookSheet";
import type { RawRow } from "../../core/domain";
import type { TableSourceType } from "../../application/import/domain";
import {
  TableParseError,
  type ParsedTable,
  type WorkbookSheetMetadata,
} from "../table/domain";

interface HeaderColumn {
  index: number;
  name: string;
}

type SheetCell = string | number | boolean | Date | null;
type SheetRow = SheetCell[];

interface WorkbookSheet {
  sheet: string;
  data: SheetRow[];
}

export interface XlsxParseOptions {
  sheetName?: string;
}

interface HeaderCandidate {
  index: number;
  columns: HeaderColumn[];
  recognizedFieldCount: number;
  requiredFieldCount: number;
  mappingScore: number;
}

interface SheetCandidate {
  sheet: WorkbookSheet;
  table?: ParsedTable;
  summary: WorkbookSheetMetadata;
  requiredFieldCount: number;
  mappingScore: number;
}

const MAX_HEADER_SCAN_ROWS = 50;

function hasExpectedFileSignature(bytes: Uint8Array, sourceType: "xlsx" | "xls"): boolean {
  if (sourceType === "xlsx") return bytes[0] === 0x50 && bytes[1] === 0x4b;
  const oleSignature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return oleSignature.every((value, index) => bytes[index] === value);
}

function hasMeaningfulValue(row: SheetRow): boolean {
  return row.some((value) => {
    if (value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });
}

function findHeaderRow(data: SheetRow[]): { index: number; row: SheetRow } | undefined {
  const index = data.findIndex(hasMeaningfulValue);
  if (index < 0) return undefined;
  const row = data[index];
  return row ? { index, row } : undefined;
}

function evaluateHeaderRow(row: SheetRow, index: number): HeaderCandidate | undefined {
  const columns = extractHeaderColumns(row);
  if (columns.length === 0) return undefined;

  const evidence = evaluateLeadTableColumns(columns.map((column) => column.name));

  return {
    index,
    columns,
    ...evidence,
  };
}

function isBetterHeader(candidate: HeaderCandidate, current: HeaderCandidate): boolean {
  if (candidate.requiredFieldCount !== current.requiredFieldCount) {
    return candidate.requiredFieldCount > current.requiredFieldCount;
  }
  if (candidate.mappingScore !== current.mappingScore) {
    return candidate.mappingScore > current.mappingScore;
  }
  if (candidate.recognizedFieldCount !== current.recognizedFieldCount) {
    return candidate.recognizedFieldCount > current.recognizedFieldCount;
  }
  if (candidate.columns.length !== current.columns.length) {
    return candidate.columns.length > current.columns.length;
  }
  return candidate.index < current.index;
}

function findBestHeaderRow(data: SheetRow[]): HeaderCandidate | undefined {
  const first = findHeaderRow(data);
  if (!first) return undefined;

  const fallback = evaluateHeaderRow(first.row, first.index);
  if (!fallback) return undefined;

  let bestRecognized: HeaderCandidate | undefined;
  data.slice(0, MAX_HEADER_SCAN_ROWS).forEach((row, index) => {
    if (!hasMeaningfulValue(row)) return;
    const candidate = evaluateHeaderRow(row, index);
    if (!candidate || candidate.recognizedFieldCount === 0) return;
    if (!bestRecognized || isBetterHeader(candidate, bestRecognized)) {
      bestRecognized = candidate;
    }
  });

  return bestRecognized ?? fallback;
}

function extractHeaderColumns(row: SheetRow): HeaderColumn[] {
  const columns: HeaderColumn[] = [];
  row.forEach((value, index) => {
    const name = value === null ? "" : String(value);
    if (name.trim().length > 0) {
      columns.push({ index, name });
    }
  });
  return columns;
}

function rowToRawRow(row: SheetRow, columns: HeaderColumn[]): RawRow | undefined {
  const output: RawRow = {};
  let hasValue = false;

  for (const column of columns) {
    const value = row[column.index] ?? "";
    output[column.name] = value;
    if (typeof value === "string" ? value.trim().length > 0 : value !== null) {
      hasValue = true;
    }
  }

  return hasValue ? output : undefined;
}

function buildSheetCandidate(
  sheet: WorkbookSheet,
  index: number,
  fileName: string,
  sourceType: TableSourceType,
): SheetCandidate {
  const header = findBestHeaderRow(sheet.data);
  if (!header) {
    return {
      sheet,
      summary: {
        name: sheet.sheet,
        index,
        rowCount: 0,
        columnCount: 0,
        recognizedFieldCount: 0,
        usable: false,
      },
      requiredFieldCount: 0,
      mappingScore: 0,
    };
  }

  const rows = sheet.data
    .slice(header.index + 1)
    .map((row) => rowToRawRow(row, header.columns))
    .filter((row): row is RawRow => row !== undefined);
  const summary: WorkbookSheetMetadata = {
    name: sheet.sheet,
    index,
    rowCount: rows.length,
    columnCount: header.columns.length,
    headerRowNumber: header.index + 1,
    recognizedFieldCount: header.recognizedFieldCount,
    usable: true,
  };

  return {
    sheet,
    summary,
    requiredFieldCount: header.requiredFieldCount,
    mappingScore: header.mappingScore,
    table: {
      columns: header.columns.map((column) => column.name),
      rows,
      metadata: {
        fileName,
        sourceType,
        rowCount: rows.length,
        columnCount: header.columns.length,
        headerRowNumber: header.index + 1,
        sheetName: sheet.sheet,
      },
      warnings: [],
    },
  };
}

function selectAutomaticSheet(candidates: SheetCandidate[]): SheetCandidate | undefined {
  const usableCandidates = candidates.filter((candidate) => candidate.table !== undefined);
  const selectedIndex = selectBestWorkbookSheetIndex(
    usableCandidates.map((candidate) => ({
      index: candidate.summary.index,
      rowCount: candidate.summary.rowCount,
      columnCount: candidate.summary.columnCount,
      recognizedFieldCount: candidate.summary.recognizedFieldCount,
      requiredFieldCount: candidate.requiredFieldCount,
      mappingScore: candidate.mappingScore,
    })),
  );
  return usableCandidates.find((candidate) => candidate.summary.index === selectedIndex);
}

export async function parseSpreadsheetBytes(
  bytes: Uint8Array,
  fileName: string,
  sourceType: "xlsx" | "xls",
  options: XlsxParseOptions = {},
): Promise<ParsedTable> {
  if (bytes.byteLength === 0) {
    throw new TableParseError("EMPTY_FILE", `${sourceType.toUpperCase()} file is empty.`);
  }
  if (!hasExpectedFileSignature(bytes, sourceType)) {
    throw new TableParseError(
      sourceType === "xls" ? "INVALID_XLS" : "INVALID_XLSX",
      `${sourceType.toUpperCase()} file signature is invalid.`,
    );
  }

  let sheets: WorkbookSheet[];
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(bytes, { type: "array", cellDates: true, dense: true });
    sheets = workbook.SheetNames.map((sheetName) => ({
      sheet: sheetName,
      data: XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName]!, {
        header: 1,
        raw: true,
        defval: null,
        blankrows: true,
      }),
    }));
  } catch (error) {
    throw new TableParseError(
      sourceType === "xls" ? "INVALID_XLS" : "INVALID_XLSX",
      `${sourceType.toUpperCase()} file could not be parsed.`,
      { cause: error },
    );
  }

  if (sheets.length === 0) {
    throw new TableParseError("EMPTY_SHEET", "XLSX workbook does not contain a worksheet.");
  }

  const candidates = sheets.map((sheet, index) => (
    buildSheetCandidate(sheet, index, fileName, sourceType)
  ));
  const selected = options.sheetName
    ? candidates.find((candidate) => candidate.sheet.sheet === options.sheetName)
    : selectAutomaticSheet(candidates);

  if (options.sheetName && !selected) {
    throw new TableParseError(
      "UNKNOWN_SHEET",
      `${sourceType.toUpperCase()} workbook does not contain a worksheet named '${options.sheetName}'.`,
    );
  }
  if (!selected?.table) {
    throw new TableParseError(
      "NO_HEADER_ROW",
      options.sheetName
        ? `${sourceType.toUpperCase()} worksheet '${options.sheetName}' does not contain a usable header row.`
        : `${sourceType.toUpperCase()} workbook does not contain a worksheet with a usable header row.`,
    );
  }

  const warnings = [...selected.table.warnings];
  if (!options.sheetName && candidates.length > 1) {
    warnings.push(
      `Automatically selected worksheet '${selected.sheet.sheet}' from ${candidates.length} worksheets.`,
    );
  }

  return {
    ...selected.table,
    metadata: {
      ...selected.table.metadata,
      sheetSelection: options.sheetName ? "manual" : "automatic",
      workbookSheets: candidates.map((candidate) => candidate.summary),
    },
    warnings,
  };
}

export function parseXlsxBytes(
  bytes: Uint8Array,
  fileName = "upload.xlsx",
  options: XlsxParseOptions = {},
): Promise<ParsedTable> {
  return parseSpreadsheetBytes(bytes, fileName, "xlsx", options);
}
