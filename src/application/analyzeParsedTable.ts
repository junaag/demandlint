import type { ParsedTable } from "../adapters/table/domain";
import type {
  CanonicalField,
  ColumnMapping,
  DatasetSource,
  ProcessedDataset,
} from "../core/domain";
import { processDataset } from "../core/processDataset";

export const REQUIRED_IMPORT_FIELDS: readonly CanonicalField[] = [
  "firstName",
  "lastName",
  "email",
  "company",
];

export interface MappingValidation {
  valid: boolean;
  errors: string[];
  missingRequiredFields: CanonicalField[];
  duplicateTargetFields: CanonicalField[];
}

export function validateMapping(
  table: ParsedTable,
  mapping: ColumnMapping,
): MappingValidation {
  const selectedTargets = table.columns
    .map((sourceColumn) => mapping[sourceColumn])
    .filter((field): field is CanonicalField => field !== undefined && field !== "ignore");

  const missingRequiredFields = REQUIRED_IMPORT_FIELDS.filter(
    (requiredField) => !selectedTargets.includes(requiredField),
  );

  const counts = new Map<CanonicalField, number>();
  for (const target of selectedTargets) {
    counts.set(target, (counts.get(target) ?? 0) + 1);
  }

  const duplicateTargetFields = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([field]) => field);

  const errors: string[] = [];
  if (missingRequiredFields.length > 0) {
    errors.push(`Required mappings missing: ${missingRequiredFields.join(", ")}.`);
  }
  if (duplicateTargetFields.length > 0) {
    errors.push(`Multiple source columns map to: ${duplicateTargetFields.join(", ")}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    missingRequiredFields,
    duplicateTargetFields,
  };
}

export function datasetSourceForTable(
  table: ParsedTable,
  sourceId = `file:${table.metadata.fileName}`,
): DatasetSource {
  return {
    id: sourceId,
    name: table.metadata.fileName,
    sourceType: table.metadata.sourceType,
    headerRowNumber: table.metadata.headerRowNumber,
    ...(table.metadata.sheetName ? { sheetName: table.metadata.sheetName } : {}),
  };
}

export function analyzeParsedTable(
  table: ParsedTable,
  mapping: ColumnMapping,
  sourceId?: string,
): ProcessedDataset {
  const validation = validateMapping(table, mapping);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return processDataset(
    table.rows,
    mapping,
    {
      requiredFields: [...REQUIRED_IMPORT_FIELDS],
      personalEmailPolicy: "warning",
    },
    datasetSourceForTable(table, sourceId),
  );
}
