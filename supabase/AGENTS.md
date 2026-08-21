# Supabase instructions

These instructions apply to `supabase/`.

## Boundary

Supabase is DemandLint's hosted control plane for identity, organizations, memberships/invitations and reusable configuration. Raw lead files, parsed rows, canonical leads, quality issues, previews and generated export contents remain browser-local.

## Security

- RLS/database functions are the authorization boundary; UI role checks are not security.
- Never expose a service-role/secret key, database password, SMTP credential, Resend API key or OAuth client secret in browser code or `VITE_*` variables.
- Every exposed organization-scoped table must enforce tenant isolation.
- Treat `SECURITY DEFINER` functions as privileged code: keep scope narrow and verify identity/role explicitly.
- Do not use user-editable metadata for authorization.

## Migrations

- Treat already-applied production migrations as immutable history.
- Add a new migration for schema/security changes rather than editing historical migrations.
- Review grants and RLS separately: API access and row authorization are different concerns.
- For updates, verify both row visibility and `WITH CHECK` behavior.
- Test cross-organization access with distinct users/organizations when tenancy rules change.

Before implementing Supabase behavior, consult current Supabase documentation because APIs/security guidance can change.

## Edge Functions

Keep server-only secrets in the function environment. Invitation/member operations must independently enforce authentication/authorization server-side.

## Completion

Document migration/function deployment steps and update `supabase/README.md` plus relevant data-model/current-state docs when production schema or behavior changes.