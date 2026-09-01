import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("static clean-route entries", () => {
  it("creates refresh-compatible HTML for every clean application route", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "demandlint-routes-"));
    temporaryDirectories.push(outputDirectory);
    writeFileSync(
      join(outputDirectory, "index.html"),
      '<script src="./assets/app.js"></script><link href="./assets/app.css">',
    );

    execFileSync(process.execPath, ["scripts/create-static-routes.mjs", outputDirectory]);

    for (const route of ["auth", "import", "templates", "settings", "terms", "privacy"]) {
      const html = readFileSync(join(outputDirectory, route, "index.html"), "utf8");
      expect(html).toContain('../assets/app.js');
      expect(html).not.toContain('="./assets/');
    }
  });
});
