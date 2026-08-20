# DemandLint V0.2.3 — Workspace administration

V0.2.3 completes the first usable team-administration workflow for hosted DemandLint workspaces.

## Included

- Settings moved next to Sign out, with the connected email shown in the header;
- transactional colleague invitations sent through Resend;
- invitation links hosted on `demandlint.com` with the invited email prefilled;
- resend and cancel controls for pending invitations;
- access revocation for active members;
- owner-managed admin/member roles;
- member promotion by admins and self-demotion from admin to member;
- atomic ownership transfer to an active admin, with the previous owner becoming admin;
- a more visible account-deletion danger zone.

## Authorization rules

- the owner can manage every non-owner role and revoke admins or members;
- admins can promote members, revoke members and demote only themselves;
- admins cannot modify or revoke another admin;
- the owner can change their own role only by transferring ownership;
- each organization has at most one owner.

Lead files and processed rows remain browser-local.
