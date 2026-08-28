import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../supabase/migrations/20260820000001_hosted_accounts.sql", import.meta.url),
);
const clientPath = fileURLToPath(new URL("../../src/adapters/supabase/client.ts", import.meta.url));
const memberManagementMigrationPath = fileURLToPath(
  new URL("../../supabase/migrations/20260820000002_member_management.sql", import.meta.url),
);
const invitationFunctionPath = fileURLToPath(
  new URL("../../supabase/functions/organization-invitations/index.ts", import.meta.url),
);
const roleManagementMigrationPath = fileURLToPath(
  new URL("../../supabase/migrations/20260820000003_workspace_role_management.sql", import.meta.url),
);
const accountDeletionPermissionMigrationPath = fileURLToPath(
  new URL("../../supabase/migrations/20260820000004_account_deletion_permissions.sql", import.meta.url),
);
const exportTemplatesMigrationPath = fileURLToPath(
  new URL("../../supabase/migrations/20260821000005_export_templates.sql", import.meta.url),
);
const optionalDestinationMigrationPath = fileURLToPath(
  new URL("../../supabase/migrations/20260824000006_export_templates_optional_destination.sql", import.meta.url),
);

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
    const baseMigration = readFileSync(migrationPath, "utf8");
    const memberMigration = readFileSync(memberManagementMigrationPath, "utf8");
    expect(baseMigration).toContain("create schema if not exists private;");
    expect(`${baseMigration}\n${memberMigration}`).not.toMatch(
      /create or replace function public\.[\s\S]{0,500}?security definer/i,
    );
  });

  it("authorizes member removal in private RPCs and sends invitations server-side", () => {
    const migration = readFileSync(memberManagementMigrationPath, "utf8");
    const invitationFunction = readFileSync(invitationFunctionPath, "utf8");

    expect(migration).toContain("private.is_organization_admin(target_organization_id)");
    expect(migration).toContain("The workspace owner cannot be removed");
    expect(migration).toContain("email_confirmed_at is null then 'invited'");
    expect(invitationFunction).toContain('Deno.env.get("RESEND_API_KEY")');
    expect(invitationFunction).toContain('userClient.auth.getUser()');
    expect(invitationFunction).not.toMatch(/VITE_.*SERVICE/i);
  });

  it("enforces a single owner and an asymmetric admin role hierarchy", () => {
    const migration = readFileSync(roleManagementMigrationPath, "utf8");

    expect(migration).toContain("organization_memberships_single_owner");
    expect(migration).toContain("Only the workspace owner can transfer ownership");
    expect(migration).toContain("Admins can promote members and demote only their own account");
    expect(migration).toContain("Admins can only revoke members");
    expect(migration).toContain("Transfer ownership before deleting your account");
    expect(migration).toContain("set role = 'admin'");
    expect(migration).toContain("set role = 'owner'");
    expect(migration).not.toMatch(
      /create or replace function public\.[\s\S]{0,500}?security definer/i,
    );
  });

  it("limits account deletion RPCs to authenticated sessions", () => {
    const migration = readFileSync(accountDeletionPermissionMigrationPath, "utf8");

    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).toContain(
      "grant execute on function public.delete_current_account() to authenticated",
    );
  });

  it("stores only export-template metadata behind organization RLS", () => {
    const migration = readFileSync(exportTemplatesMigrationPath, "utf8");
    expect(migration).toContain("create table public.export_templates");
    expect(migration).toContain("alter table public.export_templates enable row level security;");
    expect(migration).toContain("private.is_organization_member(organization_id)");
    expect(migration).toContain("grant select, insert, update, delete on public.export_templates to authenticated;");
    expect(migration).not.toMatch(/create table public\.(leads|imports|lead_rows|processed_rows)/i);
  });

  it("allows an optional destination while retaining its non-empty length validation", () => {
    const migration = readFileSync(optionalDestinationMigrationPath, "utf8");
    expect(migration).toContain("alter column destination_type drop not null");
    expect(migration).toContain("destination_type is null");
    expect(migration).toContain("char_length(trim(destination_type)) between 1 and 120");
  });

});
