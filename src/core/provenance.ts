import type { DatasetSource, RecordId, RecordProvenance } from "./domain";

export const DEFAULT_DATASET_SOURCE: DatasetSource = {
  id: "local-source",
  name: "Local import",
};

export function createRecordProvenance(
  source: DatasetSource,
  rowNumber: number,
): RecordProvenance {
  return {
    sourceId: source.id,
    sourceName: source.name,
    rowNumber,
    ...(source.sourceType ? { sourceType: source.sourceType } : {}),
    ...(source.sheetName ? { sheetName: source.sheetName } : {}),
  };
}

export function createRecordId(provenance: RecordProvenance): RecordId {
  return `${provenance.sourceId}:${provenance.rowNumber}`;
}
