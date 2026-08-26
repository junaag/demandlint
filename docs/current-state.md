# DemandLint — Current State

Audit date: **2026-08-21**  
Reference baseline: **V0.3.0** / `main` commit `c928442ba0256236e5ebfd88d514439b8971efc2`

This document separates facts found in the repository from future plans. Use it as the implementation source of truth for takeover work.

## Status legend

- ✅ **Implemented** — code exists and is part of the current workflow/release
- 🟡 **Partial / foundation only** — useful contracts or hooks exist, but the end-user capability is incomplete
- 🔵 **Planned** — approved roadmap item, not currently implemented
- 🔴 **Known issue / gap** — current V1-readiness problem that should be actively addressed

## Release validation evidence

V0.3.0 release PR `#28` records:

- 102 tests passing;
- TypeScript typecheck passing;
- production build passing;
- npm audit: 0 vulnerabilities;
- production migration `20260821_000005_export_templates.sql` applied;
- export-template RLS verified.

The handover audit could inspect the repository and PR metadata but could not rerun npm commands because its runtime had no external network access. The next developer should run `npm ci && npm run ci` immediately after cloning.

## Product / platform matrix

| Capability | Status | Repository evidence / notes |
|---|---|---|
| React + TypeScript + Vite frontend | ✅ | `package.json`, `src/`, `vite.config.ts` |
| Deterministic Clean Core | ✅ | `src/core/` |
| CSV import | ✅ | CSV adapters/tests |
| TSV import | ✅ | table/delimited workflow used by V0.3 |
| XLSX import | ✅ | `src/adapters/xlsx/parseXlsx.ts` |
| Legacy XLS import | ✅ | SheetJS parser + `legacyXls.test.ts` |
| Multi-sheet workbook inspection | ✅ | workbook metadata + sheet candidates |
| Automatic best-sheet selection | ✅ | `selectWorkbookSheet.ts`, XLSX parser/tests |
| Manual worksheet override | ✅ | parser option/UI integration |
| Header row detection beyond row 1 | ✅ | parser scans candidate header rows |
| EN / FR / ES / PT source-column recognition | ✅ | mapping engine/current README |
| Manual source mapping correction | ✅ | `MappingPanel.tsx` |
| Organization source-mapping templates | ✅ | local + Supabase repositories |
| Canonical lead model + provenance | ✅ | `src/core/domain.ts` |
| Multiple typed email values | ✅ | professional/secondary/personal contact points |
| Multiple typed phone values | ✅ | mobile/direct/standard contact points |
| Configurable contact priorities | ✅ | organization-scoped contact preferences |
| Phone normalization to E.164 | ✅ | `phoneNormalization.ts` |
| Required-field validation | ✅ | validation/application pipeline |
| Email-quality validation | ✅ | validation pipeline |
| Personal-email policy | ✅ | processing config |
| Deterministic duplicate detection | ✅ | `deduplication.ts` |
| Ready / Review / Blocked classification | ✅ | processed dataset + Data Health UI |
| Explainable issues / provenance | ✅ | issue model + review UI |
| Hosted work-email OTP auth | ✅ | Supabase account adapter/control plane |
| Organization/workspace model | ✅ | profiles, organizations, memberships |
| owner/admin/member roles | ✅ | migrations + workspace UI |
| Workspace invitations | ✅ | invitation table + Edge Function/Resend |
| Membership revoke/promote/demote | ✅ | V0.2.3 migrations/UI |
| Atomic ownership transfer | ✅ | V0.2.3 role-management migration |
| Cross-device preferences | ✅ | Supabase repository |
| Cross-device source mapping templates | ✅ | Supabase repository |
| Separate destination export templates | ✅ | `exportTemplates.ts` |
| Organization export-template persistence | ✅ | local + Supabase repositories + migration 000005 |
| Built-in Generic CRM preset | ✅ | `BUILT_IN_EXPORT_TEMPLATES` |
| Built-in Salesforce Leads preset | ✅ | `BUILT_IN_EXPORT_TEMPLATES` |
| Built-in HubSpot Contacts preset | ✅ | `BUILT_IN_EXPORT_TEMPLATES` |
| Built-in Marketo People preset | ✅ | includes prompted Program Name |
| Built-in Dynamics 365 Leads preset | ✅ | `BUILT_IN_EXPORT_TEMPLATES` |
| Exact output header names/order | ✅ | template column model |
| Deliberately empty output columns | ✅ | source kind `empty` |
| Fixed/common values | ✅ | source kind `constant` |
| Per-export prompted values | ✅ | source kind `parameter` |
| Default values | ✅ | `defaultValue` |
| Custom-field sources | ✅ | source kind `custom` |
| Safe value mappings | ✅ | `valueMappings` |
| Text/date/datetime/number/boolean output formatting | ✅ | export formatter |
| Four supported date patterns + ISO datetime | ✅ | `ExportDatePattern` |
| Required output validation | ✅ | missing required values produce blocking issues |
| Duplicate header validation | ✅ | duplicate output headers detected |
| Exact first-five-row preview | ✅ | V0.3 UI/release contract |
| Build draft template from sample CSV/TSV/XLSX/XLS | ✅ | V0.3 release/UI |
| Comma CSV export | ✅ | browser export pipeline |
| Semicolon CSV export | ✅ | browser export pipeline |
| TSV export | ✅ | browser export pipeline |
| XLSX export | ✅ | `downloadXlsxFile.ts` |
| True BIFF8 XLS export | ✅ | `downloadXlsFile.ts` / legacy XLS tests |
| XLS 65,536-row / 256-column protection | ✅ | V0.3 compatibility behavior |
| Timestamped export file names | ✅ | `exportFileName.ts` |
| Raw lead data stays browser-local | ✅ | architectural + database boundary |
| GitHub Pages deployment | ✅ | `deploy-pages.yml` |
| Custom production domain | ✅ | `public/CNAME` → `demandlint.com` |
| Supabase RLS control plane | ✅ | migrations 000001–000005 |
| Google authentication | 🟡 | hooks/feature flag exist; production flag disabled |
| Microsoft authentication | 🟡 | hooks/feature flag exist; production flag disabled |
| ImportSession with multiple sources in application model | 🟡 | model exists; UI remains single-source |
| Destination connector port | 🟡 | architecture contract/foundation; no direct CRM push adapters |
| Browser end-to-end test suite | 🔴 | no Playwright/Cypress-style E2E dependency/suite yet |
| Broad anonymized real-file regression corpus | 🔴 | current `tests/fixtures/` contains only one checked-in CSV fixture before this handover pack |
| Validated real-user usability evidence for V1 | 🔴 | open issue `#12` remains the user-test checklist |
| Production hardening/error-state pass | 🔵 | V0.4 |
| Recipes | 🔵 | V0.6 |
| Product observability | 🔵 | V0.7 |
| V1 validation program | 🔵 | V0.8 |
| Release candidate | 🔵 | V0.9 |
| Visible multi-source merge workflow | 🔵 post-V1 | intentionally deferred |
| Direct CRM API connectors/push | 🔵 post-V1 | intentionally deferred |
| Enterprise OIDC/SAML SSO | 🔵 post-V1 | intentionally deferred |
| AI-dependent quality decisions | 🔵 post-V1 / optional | must never replace deterministic truth |

## Current database/control-plane model

The applied migration history currently contains:

1. `20260820_000001_hosted_accounts.sql`
2. `20260820_000002_member_management.sql`
3. `20260820_000003_workspace_role_management.sql`
4. `20260820_000004_account_deletion_permissions.sql`
5. `20260821_000005_export_templates.sql`

Primary persisted entities are:

- `profiles`
- `organizations`
- `organization_memberships`
- `organization_invitations`
- `contact_preferences`
- `mapping_templates`
- `export_templates`

Raw imported lead records are deliberately absent from the schema.

## Known V1-readiness gaps

### 1. Real-file corpus is insufficient

The application has good deterministic/unit regression coverage, but V1 needs a representative corpus of anonymized/minimized real event and partner exports. High-risk shapes include:

- multiple workbook sheets with dashboard/statistics sheets before the lead table;
- header rows preceded by titles/blank rows;
- duplicate or strange headers;
- numeric phone cells;
- mixed date representations;
- very wide exports;
- intentionally blank required destination columns;
- encoding/delimiter differences;
- formula-derived values;
- malformed workbooks;
- files near relevant XLS/XLSX/browser-memory limits.

### 2. No browser-level E2E safety net

Vitest covers layers and adapters, but there is no full browser test proving the complete critical path from login/import through export. V0.4 should add E2E coverage for the production workflow before significant UX refactoring.

### 3. UI modules are becoming large

The architecture is layered, but several React files are already substantial:

- `src/App.tsx` ~21 KB;
- `src/components/WorkspaceSettings.tsx` ~20 KB;
- `src/components/ExportPreparation.tsx` ~19 KB.

Do not add new business logic to these components. V0.4/V0.5 may decompose UI orchestration where that reduces regression risk, but avoid gratuitous rewrites.

### 4. Hosted setup documentation had drifted behind releases

Before this handover pack, `supabase/README.md` primarily described the original V0.2.2 setup and did not clearly enumerate later migrations/export templates. Keep deployment documentation synchronized with every production migration.

### 5. OAuth buttons are architectural hooks, not completed production features

Google/Microsoft flags are currently disabled. Do not describe them as available authentication methods until end-to-end provider configuration is validated in production.

### 6. Multi-source and CRM connector foundations can create false expectations

The codebase deliberately contains future-facing contracts. Their presence does **not** mean the features are user-ready. Do not mark them complete or expand them before V1 unless the approved roadmap changes.

## Open GitHub work

At audit time, the only open repository issue found was:

- `#12` — **V0.1.0 — User test checklist**

Although old in title, it remains relevant because V1 still requires real-user evidence and real-file validation.

## Immediate next action

Start with **V0.4 Hardening** in `docs/roadmap.md`:

1. build the real-file corpus;
2. add critical browser E2E tests;
3. harden error/recovery states;
4. validate security/RLS behavior;
5. close P0/P1 defects before progressing to V0.5.