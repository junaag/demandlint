import type { ColumnMapping, ProcessedDataset, RawRow } from "../../core/domain";
import type { MappingPlan } from "../../core/mapping/domain";

export type TableSourceType = "csv" | "xlsx";

export interface ParsedTableMetadata {
  fileName: string;
  sourceType: TableSourceType;
  rowCount: number;
  columnCount: number;
  headerRowNumber: number;
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

export interface ImportSessionSource {
  id: string;
  table: ParsedTable;
  mappingPlan: MappingPlan;
  mapping: ColumnMapping;
  result?: ProcessedDataset;
}

export interface ImportSession {
  id: string;
  sources: ImportSessionSource[];
}
