import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), "utf8");
}

describe("local pre-production infrastructure", () => {
  it("uses unique canonical Supabase migration versions", () => {
    const migrationDirectory = fileURLToPath(
      new URL("../../supabase/migrations/", import.meta.url),
    );
    const migrationFiles = readdirSync(migrationDirectory)
      .filter((filename) => filename.endsWith(".sql"))
      .sort();
    const versions = migrationFiles.map((filename) => {
      const match = /^(\d{14})_[a-z0-9_]+\.sql$/.exec(filename);
      expect(match, `Invalid Supabase migration filename: ${filename}`).not.toBeNull();
      return match![1];
    });

    expect(new Set(versions).size).toBe(versions.length);
  });

  it("keeps every destructive database command explicitly local", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(packageJson.scripts["preprod:reset"]).toContain("db reset --local");
    expect(packageJson.scripts["preprod:stop"]).toContain("--project-id demandlint-preprod-local");
    expect(Object.values(packageJson.scripts).join("\n")).not.toContain("db reset --linked");
  });

  it("uses the existing migrations and a deterministic synthetic seed", () => {
    const config = read("supabase/config.toml");
    const seed = read("supabase/seed.sql");
    expect(config).toContain('project_id = "demandlint-preprod-local"');
    expect(config).toContain('sql_paths = ["./seed.sql"]');
    expect(config).toContain("[storage]");
    expect(config).toContain("enabled = true");
    expect(config).toMatch(/\[auth\][\s\S]*?enable_signup = false/);
    expect(config).toMatch(/\[auth\.email\][\s\S]*?enable_signup = true/);
    expect(seed).toContain("test@demandlint.local");
    expect(seed).toContain("DemandLint Test Workspace");
    expect(seed).toContain("Simple CSV contacts");
    expect(seed).toContain("CRM XLSX import");
    expect(seed).toContain("allowedValues");
    expect(seed).not.toMatch(/@(?:gmail|outlook|yahoo)\./i);
  });

  it("keeps concrete local Supabase values outside committed environment files", () => {
    const environment = read(".env.preprod");
    const localEnvironmentExample = read(".env.preprod.local.example");
    const gitignore = read(".gitignore");

    expect(environment).toContain("VITE_APP_ENV=preprod-local");
    expect(environment).toContain("VITE_AUTH_MODE=bypass");
    expect(environment).not.toContain("VITE_SUPABASE_URL");
    expect(environment).not.toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(environment).not.toMatch(/service[_-]?role/i);

    expect(localEnvironmentExample).toContain("VITE_SUPABASE_URL=http://127.0.0.1:54321");
    expect(localEnvironmentExample).toContain(
      "VITE_SUPABASE_PUBLISHABLE_KEY=replace-with-the-browser-safe-key-from-supabase-status",
    );
    expect(localEnvironmentExample).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    expect(localEnvironmentExample).not.toMatch(/service[_-]?role/i);
    expect(gitignore).toContain(".env.*.local");
  });
});
