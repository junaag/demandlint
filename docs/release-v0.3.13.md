# DemandLint V0.3.13 — Auth Hardening

V0.3.13 makes email OTP, Google, and Microsoft/Azure authentication converge on the same
post-authentication application flow. Supabase Auth establishes the session, then the application
calls the transactional `complete_authentication()` RPC. That RPC classifies the normalized email,
resolves pending invitations, ensures the profile, and creates an owner workspace only when the
user has no membership. Repeated callbacks are serialized on the authenticated user row and all
profile/membership inserts are conflict-safe.

The professional-email policy is authoritative in the private Supabase restriction table and
eligibility function. The frontend mirrors the same categories for the local-only account preview
and maps the RPC result to the required error title and messages. `ju.imbert@gmail.com` is the only
personal Gmail exception; when it needs a new workspace, that workspace is named `Julien Perso`.
The migration does not rewrite or delete existing rows for that account. Before applying this
migration to any hosted environment, inspect that account's profile, organizations, and memberships
and retain them if they already exist.

Application navigation now uses `/auth`, `/import`, `/templates`, and `/settings`. A protected deep
link is stored as a validated relative `next` value on `/auth`. The production build writes a nested
`index.html` for each clean route with corrected relative asset paths, which makes direct refreshes
compatible with the current GitHub Pages static deployment.

GitHub Pages does not expose a trustworthy request-country signal to this browser application.
RU/CN blocking therefore remains an external edge requirement: place the custom domain behind a
CDN/edge service and reject requests whose provider-supplied country code is `RU` or `CN` before
serving any static asset or forwarding any auth callback. Do not infer country from profile data,
email, browser locale, or a client-side IP lookup.
