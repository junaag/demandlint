import { readBrowserFile } from "../adapters/browser/readBrowserFile";
import { parseTableFile } from "../adapters/table/parseTableFile";
import {
  addImportSource,
  createImportSession,
  type ImportSession,
} from "../application/public";

function sourceIdForFile(file: File): string {
  return `file:${file.name}:${file.size}:${file.lastModified}`;
}

export interface BrowserImportOptions {
  sheetName?: string;
}

export async function createBrowserImportSession(
  file: File,
  options: BrowserImportOptions = {},
): Promise<ImportSession> {
  const localFile = await readBrowserFile(file);
  const table = await parseTableFile(localFile, options);
  const session = createImportSession(`local:${sourceIdForFile(file)}`);
  return addImportSource(session, sourceIdForFile(file), table);
}
