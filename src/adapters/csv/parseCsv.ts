import Papa, { type ParseError, type ParseResult } from "papaparse";
import type { RawRow } from "../../core/domain";
import { TableParseError, type ParsedTable } from "../table/domain";

function stripUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function meaningfulErrors(errors: ParseError[]): ParseError[] {
  return errors.filter((error) => error.code !== "UndetectableDelimiter");
}

function parseWarnings(errors: ParseError[]): string[] {
  return meaningfulErrors(errors).map((error) => {
    const row = typeof error.row === "number" ? ` at row ${error.row + 1}` : "";
    return `${error.code}${row}: ${error.message}`;
  });
}

function ensureColumns(result: ParseResult<RawRow>): string[] {
  const columns = result.meta.fields?.filter((field) => field.length > 0) ?? [];
  if (columns.length === 0) {
    throw new TableParseError("NO_HEADER_ROW", "CSV file does not contain a usable header row.");
  }
  return columns;
}

export function parseCsvText(text: string, fileName = "upload.csv"): ParsedTable {
  const source = stripUtf8Bom(text);
  if (source.trim().length === 0) {
    throw new TableParseError("EMPTY_FILE", "CSV file is empty.");
  }

  let result: ParseResult<RawRow>;
  try {
    result = Papa.parse<RawRow>(source, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
    });
  } catch (error) {
    throw new TableParseError("INVALID_CSV", "CSV file could not be parsed.", { cause: error });
  }

  const columns = ensureColumns(result);
  const warnings = parseWarnings(result.errors);

  return {
    columns,
    rows: result.data,
    metadata: {
      fileName,
      sourceType: "csv",
      rowCount: result.data.length,
      columnCount: columns.length,
      delimiter: result.meta.delimiter,
    },
    warnings,
  };
}

export function parseCsvBytes(bytes: Uint8Array, fileName = "upload.csv"): ParsedTable {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return parseCsvText(text, fileName);
  } catch (error) {
    if (error instanceof TableParseError) {
      throw error;
    }
    throw new TableParseError("INVALID_CSV", "CSV file is not valid UTF-8 text.", { cause: error });
  }
}
