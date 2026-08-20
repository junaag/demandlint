export type {
  CanonicalField,
  ColumnMapping,
  DataIssue,
  IssueType,
  ProcessedDataset,
} from "../core/domain";
export type {
  MappingConfidence,
  MappingDecision,
  MappingPlan,
} from "../core/mapping/domain";
export type {
  ImportSession,
  ImportSessionSource,
  ParsedTable,
  ParsedTableMetadata,
  WorkbookSheetMetadata,
} from "./import/domain";
export {
  addImportSource,
  analyzeImportSource,
  createImportSession,
  updateImportSourceMapping,
} from "./import/session";
export {
  evaluateLeadTableColumns,
  selectBestWorkbookSheetIndex,
} from "./import/selectWorkbookSheet";
export { validateMapping } from "./analyzeParsedTable";
