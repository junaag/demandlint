import readExcelFile from "read-excel-file/universal";
import type { RawRow } from "../../core/domain";
import { TableParseError, type ParsedTable } from "../table/domain";

interface HeaderColumn {
  index: number;
  name: string;
}

type SheetCell = string | number | boolean | Date | null;
type SheetRow = SheetCell[];

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
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

export async function parseXlsxBytes(bytes: Uint8Array, fileName = "upload.xlsx"): Promise<ParsedTable> {
  if (bytes.byteLength === 0) {
    throw new TableParseError("EMPTY_FILE", "XLSX file is empty.");
  }

  let sheets: Awaited<ReturnType<typeof readExcelFile>>;
  try {
    sheets = await readExcelFile(toArrayBuffer(bytes));
  } catch (error) {
    throw new TableParseError("INVALID_XLSX", "XLSX file could not be parsed.", { cause: error });
  }

  const sheet = sheets[0];
  if (!sheet) {
    throw new TableParseError("EMPTY_SHEET", "XLSX workbook does not contain a worksheet.");
  }

  const data = sheet.data as SheetRow[];
  const header = findHeaderRow(data);
  if (!header) {
    throw new TableParseError("NO_HEADER_ROW", "XLSX worksheet does not contain a usable header row.");
  }

  const headerColumns = extractHeaderColumns(header.row);
  if (headerColumns.length === 0) {
    throw new TableParseError("NO_HEADER_ROW", "XLSX worksheet does not contain a usable header row.");
  }

  const rows = data
    .slice(header.index + 1)
    .map((row) => rowToRawRow(row, headerColumns))
    .filter((row): row is RawRow => row !== undefined);

  return {
    columns: headerColumns.map((column) => column.name),
    rows,
    metadata: {
      fileName,
      sourceType: "xlsx",
      rowCount: rows.length,
      columnCount: headerColumns.length,
      sheetName: sheet.sheet,
    },
    warnings: [],
  };
}
