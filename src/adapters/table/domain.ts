import type { RawRow } from "../../core/domain";

export type TableSourceType = "csv" | "xlsx";

export type TableParseErrorCode =
  | "EMPTY_FILE"
  | "UNSUPPORTED_FILE_TYPE"
  | "INVALID_CSV"
  | "INVALID_XLSX"
  | "NO_HEADER_ROW"
  | "EMPTY_SHEET";

export interface ParsedTableMetadata {
  fileName: string;
  sourceType: TableSourceType;
  rowCount: number;
  columnCount: number;
  delimiter?: string;
  sheetName?: string;
}

export interface ParsedTable {
  columns: string[];
  rows: RawRow[];
  metadata: ParsedTableMetadata;
  warnings: string[];
}

export interface LocalTableFile {
  name: string;
  bytes: Uint8Array;
}

export class TableParseError extends Error {
  readonly code: TableParseErrorCode;

  constructor(code: TableParseErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TableParseError";
    this.code = code;
  }
}
