import { parseCsvBytes } from "../csv/parseCsv";
import { parseSpreadsheetBytes } from "../xlsx/parseXlsx";
import { TableParseError, type LocalTableFile, type ParsedTable } from "./domain";

export interface TableParseOptions {
  sheetName?: string;
}

function extensionOf(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}

export async function parseTableFile(
  file: LocalTableFile,
  options: TableParseOptions = {},
): Promise<ParsedTable> {
  const extension = extensionOf(file.name);

  if (extension === ".csv" || extension === ".tsv") {
    return parseCsvBytes(file.bytes, file.name);
  }

  if (extension === ".xlsx") {
    return parseSpreadsheetBytes(file.bytes, file.name, "xlsx", options);
  }

  if (extension === ".xls") {
    return parseSpreadsheetBytes(file.bytes, file.name, "xls", options);
  }

  throw new TableParseError(
    "UNSUPPORTED_FILE_TYPE",
    `Unsupported file type '${extension || "unknown"}'. DemandLint accepts .csv, .tsv, .xlsx and .xls files.`,
  );
}
