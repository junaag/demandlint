import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260831154125_auth_hardening.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("auth hardening migration", () => {
  it("checks eligibility before any application provisioning", () => {
    const policyCheck = migration.indexOf("from private.email_eligibility(current_email)");
    const profileInsert = migration.indexOf("insert into public.profiles");
    expect(policyCheck).toBeGreaterThan(-1);
    expect(profileInsert).toBeGreaterThan(policyCheck);
    expect(migration).toContain("drop trigger if exists on_auth_user_created on auth.users");
  });

  it("serializes and deduplicates repeated provisioning", () => {
    expect(migration).toContain("for update;");
    expect(migration).toContain("on conflict (id) do nothing");
    expect(migration).toContain("on conflict (organization_id, user_id) do nothing");
  });

  it("resolves invitations before deciding whether a personal workspace is needed", () => {
    const invitationMembership = migration.indexOf(
      "insert into public.organization_memberships (organization_id, user_id, role)\n  select invitation",
    );
    const newWorkspace = migration.indexOf("insert into public.organizations (name, created_by)");
    expect(invitationMembership).toBeGreaterThan(-1);
    expect(newWorkspace).toBeGreaterThan(invitationMembership);
    expect(migration).toContain("if initial_organization_id is null then");
  });

  it("keeps the Gmail exception exact and creates Julien Perso only when a workspace is needed", () => {
    expect(migration).toContain("clean_email = 'ju.imbert@gmail.com'");
    expect(migration).toContain("current_email = 'ju.imbert@gmail.com' then 'julien perso'");
    expect(migration).not.toContain("ju.imbert+%");
  });
});
