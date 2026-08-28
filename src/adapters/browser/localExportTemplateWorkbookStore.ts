import type { ExportTemplateWorkbook } from "../../application/exportTemplates";
import type { ExportTemplateWorkbookStore, StoredWorkbookUpload } from "../../application/exportTemplateWorkbook";

const DATABASE_NAME = "demandlint-export-template-workbooks";
const STORE_NAME = "workbooks";

interface StoredLocalWorkbook { path: string; bytes: ArrayBuffer }

function objectId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") throw new Error("Workbook storage is not available in this browser.");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "path" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local workbook storage could not be opened."));
  });
}

async function request<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const result = operation(transaction.objectStore(STORE_NAME));
    result.onsuccess = () => resolve(result.result);
    result.onerror = () => reject(result.error ?? new Error("Local workbook storage operation failed."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Local workbook storage transaction failed.")); };
  });
}

export class LocalExportTemplateWorkbookStore implements ExportTemplateWorkbookStore {
  async save(input: StoredWorkbookUpload): Promise<ExportTemplateWorkbook> {
    const storagePath = `${input.organizationId}/${input.templateId}/${objectId()}.xlsx`;
    const copy = new Uint8Array(input.bytes.byteLength);
    copy.set(input.bytes);
    await request("readwrite", (store) => store.put({ path: storagePath, bytes: copy.buffer } satisfies StoredLocalWorkbook));
    return {
      storagePath,
      originalFileName: input.originalFileName,
      originalFileType: input.originalFileType,
      storedFileType: "xlsx",
      targetSheet: input.targetSheet,
      headerRow: input.headerRow,
      firstDataRow: input.firstDataRow,
    };
  }

  async download(workbook: ExportTemplateWorkbook): Promise<Uint8Array> {
    const stored = await request<StoredLocalWorkbook | undefined>("readonly", (store) => store.get(workbook.storagePath));
    if (!stored) throw new Error("The stored workbook could not be found.");
    return new Uint8Array(stored.bytes);
  }

  async delete(workbook: ExportTemplateWorkbook): Promise<void> {
    await request("readwrite", (store) => store.delete(workbook.storagePath));
  }
}

export const localExportTemplateWorkbookStore = new LocalExportTemplateWorkbookStore();
