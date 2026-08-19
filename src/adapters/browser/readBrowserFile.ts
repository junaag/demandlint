import type { LocalTableFile } from "../table/domain";

export async function readBrowserFile(file: File): Promise<LocalTableFile> {
  const buffer = await file.arrayBuffer();
  return {
    name: file.name,
    bytes: new Uint8Array(buffer),
  };
}
