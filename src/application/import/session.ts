import type { ColumnMapping } from "../../core/domain";
import { suggestColumnMapping } from "../../core/mapping/suggestColumnMapping";
import { analyzeParsedTable } from "../analyzeParsedTable";
import type { ImportSession, ImportSessionSource, ParsedTable } from "./domain";

export function createImportSession(id: string): ImportSession {
  return { id, sources: [] };
}

export function addImportSource(
  session: ImportSession,
  sourceId: string,
  table: ParsedTable,
): ImportSession {
  if (session.sources.some((source) => source.id === sourceId)) {
    throw new Error(`Import source '${sourceId}' already exists in session '${session.id}'.`);
  }

  const mappingPlan = suggestColumnMapping(table.columns);
  const mapping: ColumnMapping = {};
  for (const suggestion of mappingPlan.suggestions) {
    mapping[suggestion.sourceColumn] =
      suggestion.decision === "auto" && suggestion.selectedField
        ? suggestion.selectedField
        : "ignore";
  }

  const source: ImportSessionSource = {
    id: sourceId,
    table,
    mappingPlan,
    mapping,
  };

  return {
    ...session,
    sources: [...session.sources, source],
  };
}

export function updateImportSourceMapping(
  session: ImportSession,
  sourceId: string,
  mapping: ColumnMapping,
): ImportSession {
  let found = false;
  const sources = session.sources.map((source) => {
    if (source.id !== sourceId) return source;
    found = true;
    return { ...source, mapping, result: undefined };
  });

  if (!found) {
    throw new Error(`Unknown import source '${sourceId}'.`);
  }

  return { ...session, sources };
}

export function analyzeImportSource(
  session: ImportSession,
  sourceId: string,
): ImportSession {
  let found = false;
  const sources = session.sources.map((source) => {
    if (source.id !== sourceId) return source;
    found = true;
    return {
      ...source,
      result: analyzeParsedTable(source.table, source.mapping, source.id),
    };
  });

  if (!found) {
    throw new Error(`Unknown import source '${sourceId}'.`);
  }

  return { ...session, sources };
}
