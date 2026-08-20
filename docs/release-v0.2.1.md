# DemandLint V0.2.1 — Authentication UX

## Goal

Make the first DemandLint screen as focused and familiar as a modern SaaS registration flow while
keeping the V0.2 local-preview boundary explicit.

## Included

- registration using professional email only;
- automatic preview profile name derived from the email local part;
- automatic initial workspace name derived from the email domain;
- dedicated returning-user login mode;
- visible **Sign in** link from registration and **Create an account for free** link from login;
- login error when the local profile does not exist, instead of silently creating one;
- duplicate-registration error directing the user to login;
- Google and Microsoft provider buttons positioned for the future hosted adapter;
- Google, Microsoft and organization SSO options shown on the returning-user screen;
- centered responsive authentication card inspired by the supplied SaaS reference;
- richer registration homepage with product context beside the focused account form;
- registration at the application root and a reload-safe dedicated `?page=login` URL;
- all public account, error and legal copy in English;
- linked DemandLint Conditions of Use and Privacy Policy drafts;
- legal copy documenting local file processing, browser storage and the current GitHub Pages boundary;
- no password, CAPTCHA or fake social authentication in the local preview;
- 74 automated tests across 18 suites at release preparation time.

## Acceptance test

1. Open DemandLint with no existing local session and confirm registration is the homepage.
2. Confirm that registration contains only **Work email**.
3. Confirm the presence of Google and Microsoft buttons and the **Sign in** link.
4. Create an account with a new email and verify that DemandLint opens the import workspace.
5. Sign out and select **Sign in**.
6. Confirm the Google, Microsoft and **Organization** entry points are visible.
7. Enter the same email and verify that the existing workspace reopens.
8. Sign out and try an unknown email on the login screen; verify that no account is created.
9. Return to account creation and try the existing email; verify that the UI directs you to login.
10. Check the authentication card on desktop and mobile widths.
11. Open **Terms and Conditions** and **Privacy Policy** from registration.
12. Reload the login, Terms and Privacy URLs and confirm each route remains open.

## Still not production authentication

The account remains stored in the current browser only. Google/Microsoft OAuth, passwordless email,
secure invitations and cross-device synchronization require the future hosted authentication and
database adapters.

The publisher identity, legal contact, governing law and final processor list must be completed and
reviewed before commercial launch.
