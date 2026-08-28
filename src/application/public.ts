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
export type {
  AccountUser,
  AccountWorkspace,
  AuthSession,
  CreateAccountInput,
  CreateOrganizationInput,
  MembershipRole,
  Organization,
  OrganizationMember,
  OrganizationMembership,
} from "./accounts/domain";
export type { MappingTemplate } from "./mapping/contracts";
export {
  runtimeMappingFromSourceMapping,
  sourceMappingFromRuntime,
} from "./mapping/contracts";
export type {
  ExportColumnSource,
  EmptyValueHandling,
  ExportDatePattern,
  ExportParameterValues,
  ExportTemplate,
  ExportTemplateColumn,
  ExportTemplateWorkbook,
  ExportTemplateWorkbookSourceType,
  ExportValidationIssue,
  ExportValueFormat,
  ExportValueMapping,
  ExportValidationOutcome,
  ExportValidationRule,
  ExportRequiredWhenOperator,
  ExportSimpleValidationKind,
} from "./exportTemplates";
export type {
  ExportTemplateWorkbookAttachmentInput,
  ExportTemplateWorkbookChange,
} from "./exportTemplateWorkbook";
export { assertWorkbookCoordinates, workbookHeaderCompatibility } from "./exportTemplateWorkbook";
export {
  CANONICAL_FIELD_LABELS,
  CANONICAL_FIELD_OPTIONS,
  CURRENT_CANONICAL_FIELDS,
  buildTemplateExport,
  cloneExportTemplate,
  copyExportTemplate,
  createExportTemplateDraft,
  exportTemplateId,
  exportParameterColumns,
  exportRuntimeColumns,
  exportRuntimeValueIdentity,
  exportRuntimeValueKey,
  emptyValueHandlingFor,
  normalizeExportTemplate,
  templateColumnId,
} from "./exportTemplates";
export type {
  ExportTemplateDraftSelection,
  ExportTemplateFileAnalysis,
  ExportTemplateFileSheet,
  ExportTemplateHeaderRow,
} from "./exportTemplateFileImport";
export { createExportTemplateDraftFromFileAnalysis } from "./exportTemplateFileImport";
