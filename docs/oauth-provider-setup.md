# DemandLint OAuth provider setup

Google and Microsoft buttons are implemented in the `/auth` page, but each button must stay disabled until its provider is fully configured in Supabase Auth.

## Shared Supabase configuration

- Set **Site URL** to `https://app.demandlint.com`.
- Add `https://app.demandlint.com/auth` to the **Redirect URLs** allowlist.
- Use this Supabase callback URL in both provider consoles:
  `https://pvbqjpsmyxujksjjxcah.supabase.co/auth/v1/callback`.
- Never put provider secrets in Vite variables or GitHub Actions. Store them only in the provider console and Supabase Auth.

## Google

Create a Google OAuth client for a **Web application** and configure:

- Authorized JavaScript origin: `https://app.demandlint.com`
- Authorized redirect URI: `https://pvbqjpsmyxujksjjxcah.supabase.co/auth/v1/callback`
- Consent-screen scopes: `openid`, email, and profile

Then add the Google **Client ID** and **Client Secret** in Supabase Dashboard → Authentication → Sign In / Providers → Google, and enable the provider.

## Microsoft

Register a web application in Microsoft Entra ID and configure:

- Redirect URI: `https://pvbqjpsmyxujksjjxcah.supabase.co/auth/v1/callback`
- An account audience appropriate for DemandLint
- The optional `email` and `xms_edov` ID-token claims recommended by Supabase

Then add the Entra **Application (client) ID**, the **client secret value** (not its secret ID), and the Azure tenant URL in Supabase Dashboard → Authentication → Sign In / Providers → Azure, and enable the provider. The frontend requests the required `email` scope.

## Safe activation

After both provider flows have been tested end to end:

1. Confirm the public Supabase Auth settings endpoint reports `external.google: true` and/or `external.azure: true`.
2. Set the matching `VITE_AUTH_GOOGLE_ENABLED` and `VITE_AUTH_MICROSOFT_ENABLED` values to `"true"` in `.github/workflows/deploy-pages.yml`.
3. Merge only after CI passes and test `/auth` in production with each enabled provider.

Until those checks pass, keep the deployment flags set to `"false"`.
