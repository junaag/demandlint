import ExcelJS, { type Cell, type Row, type Worksheet } from "exceljs";
import type { RawRow } from "../../core/domain";
import { TableParseError, type ParsedTable } from "../table/domain";

interface HeaderColumn {
  index: number;
  name: string;
}

function isMeaningfulCell(cell: Cell): boolean {
  return cell.value !== null && cell.text.trim().length > 0;
}

function findHeaderRow(worksheet: Worksheet): Row | undefined {
  let found: Row | undefined;
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (!found && row.cellCount > 0) {
      let hasValue = false;
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (isMeaningfulCell(cell)) {
          hasValue = true;
        }
      });
      if (hasValue) {
        found = row;
      }
    }
  });
  return found;
}

function extractHeaderColumns(row: Row): HeaderColumn[] {
  const columns: HeaderColumn[] = [];
  row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const name = cell.text;
    if (name.trim().length > 0) {
      columns.push({ index: columnNumber, name });
    }
  });
  return columns;
}

function toRawCellValue(cell: Cell): unknown {
  const value = cell.value;
  if (value === null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  return cell.text;
}

function rowToRawRow(row: Row, columns: HeaderColumn[]): RawRow | undefined {
  const output: RawRow = {};
  let hasValue = false;

  for (const column of columns) {
    const cell = row.getCell(column.index);
    const value = toRawCellValue(cell);
    output[column.name] = value;
    if (typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined) {
      hasValue = true;
    }
  }

  return hasValue ? output : undefined;
}

export async function parseXlsxBytes(bytes: Uint8Array, fileName = "upload.xlsx"): Promise<ParsedTable> {
  if (bytes.byteLength === 0) {
    throw new TableParseError("EMPTY_FILE", "XLSX file is empty.");
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(bytes as Parameters<typeof workbook.xlsx.load>[0]);
  } catch (error) {
    throw new TableParseError("INVALID_XLSX", "XLSX file could not be parsed.", { cause: error });
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new TableParseError("EMPTY_SHEET", "XLSX workbook does not contain a worksheet.");
  }

  const headerRow = findHeaderRow(worksheet);
  if (!headerRow) {
    throw new TableParseError("NO_HEADER_ROW", "XLSX worksheet does not contain a usable header row.");
  }

  const headerColumns = extractHeaderColumns(headerRow);
  if (headerColumns.length === 0) {
    throw new TableParseError("NO_HEADER_ROW", "XLSX worksheet does not contain a usable header row.");
  }

  const rows: RawRow[] = [];
  for (let rowNumber = headerRow.number + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = rowToRawRow(worksheet.getRow(rowNumber), headerColumns);
    if (row) {
      rows.push(row);
    }
  }

  return {
    columns: headerColumns.map((column) => column.name),
    rows,
    metadata: {
      fileName,
      sourceType: "xlsx",
      rowCount: rows.length,
      columnCount: headerColumns.length,
      sheetName: worksheet.name,
    },
    warnings: [],
  };
}
