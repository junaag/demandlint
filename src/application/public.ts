export type {
  CanonicalField,
  ColumnMapping,
  ContactExportMode,
  ContactPreferences,
  DataIssue,
  EmailKind,
  IssueType,
  ProcessedDataset,
  PhoneKind,
} from "../core/domain";
export { DEFAULT_CONTACT_PREFERENCES } from "../core/contactPoints";
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
