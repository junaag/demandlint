import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function filesUnder(root: string, extension: string): string[] {
  const output: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(path, extension));
    else if (extname(path) === extension) output.push(path);
  }

  return output;
}

function source(path: string): string {
  return readFileSync(path, "utf8");
}

const srcRoot = fileURLToPath(new URL("../../src", import.meta.url));

describe("architecture boundaries", () => {
  it("keeps React components away from core and adapter implementation imports", () => {
    const reactFiles = filesUnder(srcRoot, ".tsx");

    for (const path of reactFiles) {
      const text = source(path);
      expect(text, `${path} imports the Clean Core directly`).not.toMatch(/from\s+["'][^"']*\/core(?:\/|["'])/);
      expect(text, `${path} imports an adapter directly`).not.toMatch(/from\s+["'][^"']*\/adapters(?:\/|["'])/);
    }
  });

  it("keeps the Clean Core independent from application, adapters, composition and React", () => {
    const coreRoot = join(srcRoot, "core");
    const coreFiles = filesUnder(coreRoot, ".ts");

    for (const path of coreFiles) {
      const text = source(path);
      expect(text, `${path} imports React`).not.toMatch(/from\s+["']react/);
      expect(text, `${path} imports application code`).not.toMatch(/from\s+["'][^"']*application/);
      expect(text, `${path} imports adapters`).not.toMatch(/from\s+["'][^"']*adapters/);
      expect(text, `${path} imports composition`).not.toMatch(/from\s+["'][^"']*composition/);
    }
  });
});
