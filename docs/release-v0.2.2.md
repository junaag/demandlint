# DemandLint V0.2.2 — Hosted passwordless accounts

## Goal

Replace the browser-only account preview with a secure, cross-device account control plane while
preserving DemandLint's local-first processing of lead files.

## Included

- Supabase Free authentication and Postgres persistence adapter;
- work-email registration and returning-user login using a 6-digit one-time code;
- no password collection, reset flow or password storage;
- persisted and automatically refreshed browser session;
- separate registration homepage and `?page=login` returning-user route;
- automatic profile and initial organization creation;
- multiple organizations per user with owner/admin/member roles;
- pending work-email invitations that activate when the invited user registers;
- cross-device contact-priority and mapping-template synchronization;
- organization-scoped Row Level Security on every exposed table;
- account deletion with explicit `DELETE` confirmation;
- Google and Microsoft provider hooks behind disabled feature flags;
- updated Terms and Privacy drafts describing hosted account data and local lead processing;
- GitHub Pages build variables for browser-safe Supabase configuration.

## Data boundary

Supabase stores account identity, organizations, memberships, invitations, preferences and mapping
templates. DemandLint does not store uploaded CSV/XLSX files, source lead rows, processed lead rows
or generated exports. Those remain transient in the browser.

## Acceptance test

1. Open the application root in a clean browser and confirm registration is the homepage.
2. Enter a new work email and confirm the application asks for a 6-digit code.
3. Enter the emailed code and confirm the initial organization opens.
4. Sign out and use `?page=login` with the same email and a new code.
5. Reload after authentication and confirm the session persists.
6. Change phone/email priorities, save a mapping template and reopen the account in another browser.
7. Confirm the same organization preferences and template are available.
8. Invite a second work email, then register with that address and confirm access to the organization.
9. Confirm a member cannot invite other users while owners/admins can.
10. Upload a CSV/XLSX file and confirm browser network traffic never contains the lead rows.
11. Confirm Google/Microsoft remain disabled until explicitly configured.
12. Delete a test account using the explicit confirmation flow.

## Operational note

The Supabase migration and GitHub repository variables must be configured before the hosted build is
deployed. The publishable browser key is not an administrative secret; security depends on the RLS
policies. A `service_role` key must never be exposed to Vite or GitHub Pages. New Supabase Free
projects also require a custom SMTP provider before the six-digit OTP email template can be used.
