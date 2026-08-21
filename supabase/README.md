# DemandLint — Supabase Hosted Control Plane

Current application baseline: **V0.3.0**

Supabase is used for DemandLint's hosted **control plane**:

- passwordless authentication;
- profiles;
- organizations/workspaces;
- memberships and invitations;
- contact preferences;
- source mapping templates;
- destination export templates.

Uploaded CSV/TSV/XLSX/XLS lead files, parsed rows, canonical leads, quality issues, previews and generated export contents stay in the browser and are intentionally absent from the Supabase schema.

## Security boundary

The browser uses only a public/publishable Supabase project key. Row Level Security and narrowly scoped database functions/RPCs are the authorization boundary.

Never place any of the following in a `VITE_*` variable or browser code:

- Supabase service-role/secret key;
- database password;
- SMTP credentials;
- Resend API key;
- OAuth client secret.

Client-side owner/admin/member checks are UX controls only and must never replace database authorization.

## Current production migration sequence

Apply migrations in repository order:

```text
supabase/migrations/20260820_000001_hosted_accounts.sql
supabase/migrations/20260820_000002_member_management.sql
supabase/migrations/20260820_000003_workspace_role_management.sql
supabase/migrations/20260820_000004_account_deletion_permissions.sql
supabase/migrations/20260821_000005_export_templates.sql
```

### 000001 — Hosted accounts

Creates the initial multi-tenant control plane:

- `organizations`
- `profiles`
- `organization_memberships`
- `organization_invitations`
- `contact_preferences`
- `mapping_templates`
- helper functions, trigger logic and RLS policies.

New users receive a profile and either accept matching pending invitations or receive an initial organization/workspace.

### 000002 — Member management

Adds the hosted member/invitation lifecycle operations needed by workspace administration and invitation delivery.

### 000003 — Workspace role management

Adds the owner/admin/member hierarchy and atomic ownership-transfer behavior.

### 000004 — Account deletion permissions

Hardens account deletion permissions.

### 000005 — Export templates

Adds organization-scoped `export_templates` with RLS and authenticated CRUD for organization members.

Only reusable template metadata is stored in `config jsonb`; lead rows and generated outputs remain browser-local.

## Migration discipline

These migrations represent production history. Treat applied migrations as immutable.

For a future schema change:

1. create a new migration with the Supabase CLI rather than inventing/reusing an old migration filename;
2. review tenant isolation and the security checklist;
3. ensure every table exposed through the Data API has appropriate grants and RLS;
4. verify `SELECT`, `INSERT`, `UPDATE` and `DELETE` behavior for the intended roles;
5. test a user from another organization cannot access the new rows;
6. run database/security advisors where available;
7. apply the migration explicitly to production;
8. update this README and `docs/data-model.md` / `docs/current-state.md`.

Do not assume a GitHub Pages frontend deployment applies database migrations.

## Passwordless work-email authentication

DemandLint's current production account flow is a one-time code sent to the user's work email.

The browser adapter uses Supabase Auth and verifies the numeric OTP. The production Supabase project must therefore have email delivery/templates configured so the authentication email presents the expected verification code.

When changing Auth configuration, validate the complete production flow rather than only the button/UI state:

```text
register
→ receive code
→ verify code
→ profile/workspace loads
→ sign out
→ sign in again
→ session/workspace restores correctly
```

## Allowed application URLs

The hosted project should permit the application's expected environments, including:

- production: `https://demandlint.com`
- legacy GitHub Pages URL while it remains supported
- local development: `http://localhost:5173`

Keep redirect URLs synchronized with any future routing/domain change.

## Browser configuration

For local development:

```bash
cp .env.example .env.local
```

Required browser-safe variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_AUTH_GOOGLE_ENABLED=false
VITE_AUTH_MICROSOFT_ENABLED=false
```

The deployment workflow currently supplies the corresponding production browser configuration.

The publishable key is intended for public clients; RLS is still required for authorization.

## Google / Microsoft authentication

Integration hooks and feature flags exist, but the current production flags are disabled.

Do not set either flag to `true` simply because a button/provider exists in code. Enable a provider only after:

1. creating/configuring the external OAuth application;
2. configuring the matching Supabase Auth provider;
3. validating redirect URLs;
4. testing account creation and returning-user sign-in;
5. testing organization/invitation behavior for OAuth-created sessions;
6. confirming logout/session recovery;
7. validating the production flow on `demandlint.com`.

Enterprise OIDC/SAML SSO remains outside the approved V1 scope unless reprioritized.

## Workspace invitation Edge Function

Function:

```text
supabase/functions/organization-invitations/
```

It sends transactional workspace invitation email through Resend.

Server-side secrets required by the function include:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
DEMANDLINT_APP_URL
```

Expected production values include an application URL of `https://demandlint.com` and an authorized sender on the DemandLint domain.

Never move the Resend API key into frontend code.

After changing invitation logic, validate:

- owner/admin authorization;
- invitation creation;
- delivery;
- resend;
- cancellation;
- invited-user registration/login;
- membership acceptance;
- access revocation;
- cross-organization isolation.

## Role model

Current workspace roles:

- `owner`
- `admin`
- `member`

The database enforces the role/ownership lifecycle. Important product behavior includes:

- owner can manage admins/members;
- ownership can be transferred atomically to an active admin;
- former owner becomes admin after transfer;
- admin cannot modify/revoke another admin;
- database preserves a single owner per organization.

Do not relax server-side rules merely to simplify a UI action.

## RLS validation checklist

For every organization-scoped table, verify with two separate users/organizations:

- user A can read only organizations they belong to;
- user A cannot read organization B's configuration by guessing its UUID;
- inserts cannot target an unauthorized organization;
- updates cannot move a row into another organization;
- deletes cannot remove another organization's rows;
- anonymous access is denied where not intended;
- privileged functions independently check authenticated identity/role.

For `UPDATE`, remember that the access model requires the row to be selectable as well as passing the update checks.

## Data that must remain outside Supabase

Unless a future ADR explicitly changes the architecture, do not persist:

- uploaded lead files;
- raw file rows;
- canonical leads;
- email/phone values from imported records;
- Data Health row issues;
- Ready/Review/Blocked datasets;
- destination preview rows;
- generated CSV/XLS/XLSX data.

Reusable configuration and account metadata may synchronize; customer lead content does not.

## V1 hardening requirements

Before V1, Supabase-related work should focus on evidence rather than adding platform breadth:

- cross-organization RLS regression checks;
- owner/admin/member lifecycle validation;
- invitation flow validation;
- auth/session recovery tests;
- migration parity/documentation;
- privacy-safe operational diagnostics;
- no P0/P1 security defects.

Direct CRM credentials/connectors and enterprise SSO remain post-V1 unless product priority changes.