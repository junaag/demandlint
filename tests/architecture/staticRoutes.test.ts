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

    for (const route of [
      "auth",
      "import",
      "templates",
      "settings",
      "terms",
      "privacy",
      "product",
      "solutions",
      "documentation",
    ]) {
      const html = readFileSync(join(outputDirectory, route, "index.html"), "utf8");
      expect(html).toContain('../assets/app.js');
      expect(html).not.toContain('="./assets/');
    }
  });

  it("writes route-specific metadata for public pages", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "demandlint-routes-"));
    temporaryDirectories.push(outputDirectory);
    writeFileSync(
      join(outputDirectory, "index.html"),
      '<title>Home</title><meta name="description" content="Home"><meta property="og:title" content="Home"><meta property="og:description" content="Home"><meta property="og:url" content="https://demandlint.com/">',
    );

    execFileSync(process.execPath, ["scripts/create-static-routes.mjs", outputDirectory]);

    const productHtml = readFileSync(join(outputDirectory, "product", "index.html"), "utf8");
    expect(productHtml).toContain("DemandLint Product — Data Mapping, Validation & Export");
    expect(productHtml).toContain("https://demandlint.com/product");
  });
});
