import type { ColumnMapping, ProcessedDataset, RawRow } from "../../core/domain";
import type { MappingPlan } from "../../core/mapping/domain";

export type TableSourceType = "csv" | "xlsx" | "xls";

export interface WorkbookSheetMetadata {
  name: string;
  index: number;
  rowCount: number;
  columnCount: number;
  headerRowNumber?: number;
  recognizedFieldCount: number;
  usable: boolean;
}

export interface ParsedTableMetadata {
  fileName: string;
  sourceType: TableSourceType;
  rowCount: number;
  columnCount: number;
  headerRowNumber: number;
  delimiter?: string;
  sheetName?: string;
  sheetSelection?: "automatic" | "manual";
  workbookSheets?: WorkbookSheetMetadata[];
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

export interface ImportSessionSource {
  id: string;
  table: ParsedTable;
  mappingPlan: MappingPlan;
  mapping: ColumnMapping;
  result?: ProcessedDataset | undefined;
}

export interface ImportSession {
  id: string;
  sources: ImportSessionSource[];
}
