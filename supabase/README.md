# DemandLint hosted account setup

DemandLint V0.2.2 uses Supabase only for the account control plane: authentication, profiles,
organizations, memberships, contact preferences and mapping templates. CSV/XLSX lead files and
their processed rows stay in the browser and are not written to Supabase.

## 1. Create the Free project

Create a Supabase Free project for DemandLint. Keep the project password and every secret key in
the Supabase dashboard or another secret manager; do not add them to this repository.

## 2. Apply the database migration

Open **SQL Editor** in the Supabase dashboard, paste the complete contents of
`migrations/20260820_000001_hosted_accounts.sql`, and run it once.

The migration creates the multi-tenant tables, RPC functions and Row Level Security policies. It
also creates a first organization when a user registers and accepts matching organization invites
when an invited address registers later.

## 3. Configure passwordless email OTP

For projects created on the Free plan after June 3, 2026, Supabase requires a custom SMTP provider
before authentication email templates can be customized. Configure that provider first in
**Authentication → SMTP Settings**.

Then edit the magic-link/confirmation template in **Authentication → Email Templates** so the
message shows the numeric token using:

```html
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
- Production redirect: `https://demandlint.com/**`
- Legacy GitHub Pages redirect: `https://junaag.github.io/demandlint/**`
- Local development redirect: `http://localhost:5173/**`

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
