import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../supabase/migrations/20260820_000001_hosted_accounts.sql", import.meta.url),
);
const clientPath = fileURLToPath(new URL("../../src/adapters/supabase/client.ts", import.meta.url));

describe("Supabase hosted account boundary", () => {
  it("enables RLS on every exposed DemandLint table", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const tables = [
      "organizations",
      "profiles",
      "organization_memberships",
      "organization_invitations",
      "contact_preferences",
      "mapping_templates",
    ];

    for (const table of tables) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("does not create a raw lead-data table", () => {
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).not.toMatch(/create table public\.(leads|imports|lead_rows|processed_rows)/i);
  });

  it("uses only browser-safe Vite configuration in the Supabase client", () => {
    const client = readFileSync(clientPath, "utf8");
    expect(client).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(client).not.toMatch(/service[_-]?role/i);
  });

  it("keeps security-definer implementations out of the exposed public schema", () => {
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("create schema if not exists private;");
    expect(migration).not.toMatch(
      /create or replace function public\.[\s\S]{0,500}?security definer/i,
    );
  });
});
