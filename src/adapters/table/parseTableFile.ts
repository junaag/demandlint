import { parseCsvBytes } from "../csv/parseCsv";
import { parseXlsxBytes } from "../xlsx/parseXlsx";
import { TableParseError, type LocalTableFile, type ParsedTable } from "./domain";

function extensionOf(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}

export async function parseTableFile(file: LocalTableFile): Promise<ParsedTable> {
  const extension = extensionOf(file.name);

  if (extension === ".csv") {
    return parseCsvBytes(file.bytes, file.name);
  }

  if (extension === ".xlsx") {
    return parseXlsxBytes(file.bytes, file.name);
  }

  throw new TableParseError(
    "UNSUPPORTED_FILE_TYPE",
    `Unsupported file type '${extension || "unknown"}'. DemandLint currently accepts .csv and .xlsx files.`,
  );
}
