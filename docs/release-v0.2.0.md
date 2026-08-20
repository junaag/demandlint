# DemandLint V0.2.0 — Account Workspace Preview

## Goal

Validate the account, organization, preferences and saved-mapping experience before selecting and
connecting a hosted identity/database provider. Lead files still never leave the browser.

## Included

- local test profile required before accessing imports;
- profile reopening by normalized email, without collecting a password;
- creation and switching of organization workspaces;
- owner/admin/member role simulation and local member list;
- phone/email priorities and export settings isolated by organization;
- saved source mapping templates isolated by organization;
- exact column-signature indicator, manual apply and delete actions;
- clean migration fallback from the V0.1.3 device-level contact preferences;
- responsive account, navigation and settings UI;
- 73 automated tests across 18 suites at release preparation time.

## Important boundary

This is a local account preview, not production authentication. The profile, organizations,
members, preferences and mapping templates are stored in the current browser. They do not yet
synchronize across devices, and the member action does not send an invitation email.

Google, Microsoft, OIDC and SAML remain provider-neutral authentication methods in the application
contract. A hosted auth/database adapter can replace the preview repository without changing the
lead-quality Clean Core.

## Suggested acceptance test

1. Open DemandLint and create a local profile with a name, work email and organization.
2. Confirm that the import page is unavailable before the profile is created.
3. Open **Settings**, change the phone priority and default country, then reload the page.
4. Upload `TDB_UIPATH.xlsx`; confirm that `Leads online` is selected automatically.
5. Save the current mapping as a named template, reset the file, upload it again and apply the template.
6. Create a second organization and confirm that its preferences and templates start independently.
7. Add a test member as member or admin and confirm the role shown in the list.
8. Switch back to the first organization and confirm its preferences and mapping template return.
9. Run the analysis and export the contact fields to confirm V0.1.3 behavior is unchanged.
10. Sign out, then reopen the same email profile and confirm the workspaces are restored.

## Not included yet

- password, magic-link or social authentication;
- Google or Microsoft OAuth;
- enterprise OIDC/SAML SSO;
- secure email invitations;
- cloud/cross-device synchronization;
- server-side audit log.
