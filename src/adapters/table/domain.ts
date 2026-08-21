export type {
  LocalTableFile,
  ParsedTable,
  ParsedTableMetadata,
  TableSourceType,
  WorkbookSheetMetadata,
} from "../../application/import/domain";

export type TableParseErrorCode =
  | "EMPTY_FILE"
  | "UNSUPPORTED_FILE_TYPE"
  | "INVALID_CSV"
  | "INVALID_XLSX"
  | "INVALID_XLS"
  | "NO_HEADER_ROW"
  | "EMPTY_SHEET"
  | "UNKNOWN_SHEET";

export class TableParseError extends Error {
  readonly code: TableParseErrorCode;

  constructor(code: TableParseErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TableParseError";
    this.code = code;
  }
}
