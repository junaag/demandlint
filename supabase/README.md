# DemandLint Supabase setup

For the local pre-production workflow, use the root-level `npm run preprod*` commands documented in
the main README. `config.toml` is intentionally local-only, replays the existing migrations, and
loads `seed.sql`; never link or push that seed to a hosted project.

The migrations through `20260824000006` predate the repository's Supabase CLI configuration and
were documented for manual SQL Editor deployment. Their canonical timestamps support local replay;
they must not be treated as proof of matching production migration history. Before any future
production `supabase db push`, compare the remote history with `supabase migration list --linked`
and deliberately baseline or repair it. Do not run that reconciliation as part of local pre-prod.

## Hosted production account setup

DemandLint V0.2.2 uses Supabase only for the account control plane: authentication, profiles,
organizations, memberships, contact preferences and mapping templates. CSV/XLSX lead files and
their processed rows stay in the browser and are not written to Supabase.

## 1. Create the Free project

Create a Supabase Free project for DemandLint. Keep the project password and every secret key in
the Supabase dashboard or another secret manager; do not add them to this repository.

## 2. Apply the database migration

Open **SQL Editor** in the Supabase dashboard, paste the complete contents of
`migrations/20260820000001_hosted_accounts.sql`, and run it once.

The migrations create the multi-tenant tables, RPC functions and Row Level Security policies.
Beginning with V0.3.13, `complete_authentication()` is the single post-authentication entry point:
it applies the professional-email policy, accepts matching invitations, and only creates a first
organization when the user still has no membership. The operation locks the authenticated user row
and uses conflict-safe inserts so repeated email or OAuth callbacks remain idempotent.

## 3. Configure passwordless email OTP

For projects created on the Free plan after June 3, 2026, Supabase requires a custom SMTP provider
before authentication email templates can be customized. Configure that provider first in
**Authentication → SMTP Settings**.

Then edit the magic-link/confirmation template in **Authentication → Email Templates** so the
message shows the numeric token using:

```html
<img src="https://demandlint.com/brand/demandlint-logo-email.png" width="240" height="56" alt="DemandLint">
<p>Your DemandLint verification code is:</p>
<h2>{{ .Token }}</h2>
<p>This code can only be used once.</p>
```

The application verifies a 6-digit token. Do not leave the template as a link-only message. If no
custom SMTP provider is configured, use the magic-link variant of DemandLint instead of deploying
this OTP form.

## 4. Configure allowed URLs

In **Authentication → URL Configuration**, set:

- Site URL: `https://demandlint.com`
- Production callback: `https://demandlint.com/auth`
- Legacy GitHub Pages callback: `https://junaag.github.io/demandlint/auth`
- Local development callback: `http://localhost:5173/auth`

The GitHub Pages URL stays temporarily allowed so an in-flight session still works while DNS and
the custom domain certificate propagate.

## 5. Configure the GitHub Pages build

In **GitHub → demandlint → Settings → Secrets and variables → Actions → Variables**, add:

- `VITE_SUPABASE_URL`: the project URL from **Project Settings → API**
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the browser-safe publishable key from the same page
- `VITE_AUTH_GOOGLE_ENABLED`: `false`
- `VITE_AUTH_MICROSOFT_ENABLED`: `false`

The publishable key is designed for browser clients; RLS is the actual authorization boundary.
Never use the `service_role` key in a `VITE_` variable or browser code.

For local development, copy `.env.example` to `.env.local` and fill in the same browser-safe
values. `.env.local` is ignored by Git.

## 6. Verify before enabling OAuth

Register with a test work email, enter the received 6-digit code, sign out, and sign in again.
Verify organization switching, invitations, preference sync and mapping-template sync in a second
browser session.

Google and Microsoft buttons stay disabled until their OAuth applications and Supabase providers
are configured. Enable each corresponding GitHub variable only after its full OAuth flow passes.

Both providers must return to `/auth`; the browser then calls `complete_authentication()` before it
opens any protected route. The Azure client requests the required `email` scope; the Entra app
should also include the optional `xms_edov` claim so Supabase can reject unverified email domains.
Provider credentials remain in the Supabase dashboard and must never be added to `VITE_` variables.

## 7. Configure workspace invitation email

The `organization-invitations` Edge Function sends transactional workspace invitations through
Resend. Add these Edge Function secrets before deploying it:

- `RESEND_API_KEY`: a Resend API key allowed to send from `demandlint.com`
- `RESEND_FROM_EMAIL`: `DemandLint <auth@demandlint.com>`
- `DEMANDLINT_APP_URL`: `https://demandlint.com`

Deploy `migrations/20260820000002_member_management.sql`, then deploy the function with JWT
verification enabled. Invitation links use `demandlint.com` and open a prefilled registration or
login page; DemandLint then sends the usual 6-digit authentication code.
