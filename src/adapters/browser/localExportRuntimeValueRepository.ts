import type { ExportParameterValues } from "../../application/exportTemplates";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "demandlint.export-runtime-values.v1";

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

/** Browser-only convenience storage for reusable per-template export values. */
export class LocalExportRuntimeValueRepository {
  constructor(private readonly storage: StorageLike | undefined = browserStorage()) {}

  read(templateId: string): ExportParameterValues {
    try {
      const stored = JSON.parse(this.storage?.getItem(STORAGE_KEY) ?? "{}") as Record<string, ExportParameterValues>;
      const values = stored[templateId];
      return values && typeof values === "object" ? values : {};
    } catch {
      return {};
    }
  }

  save(templateId: string, values: ExportParameterValues): void {
    try {
      const stored = JSON.parse(this.storage?.getItem(STORAGE_KEY) ?? "{}") as Record<string, ExportParameterValues>;
      stored[templateId] = values;
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Exporting remains available when browser storage is unavailable.
    }
  }
}

export const localExportRuntimeValueRepository = new LocalExportRuntimeValueRepository();
