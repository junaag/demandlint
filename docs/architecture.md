# DemandLint — Architecture

Current baseline: **V0.3.0**  
Architecture goal: preserve a local-first, deterministic Clean Core while supporting a secure multi-tenant control plane and reusable destination-ready workflows without rewriting the data-quality engine.

## Dependency rule

```text
React UI
   ↓
Composition
   ↓
Application / public contracts
   ↓
Clean Core

Adapters implement Application-facing ports and runtime boundaries.
```

The direction is intentional:

- UI renders state and invokes use cases;
- Composition chooses concrete adapters;
- Application owns workflow/use-case contracts;
- Clean Core owns deterministic lead-domain rules;
- Adapters translate files, browser APIs, Supabase and future external providers.

The Clean Core must never import React, browser APIs, file parser libraries, Supabase, CRM SDKs or AI providers.

## Runtime topology

DemandLint deliberately separates two planes.

```text
┌──────────────────────── Browser data plane ────────────────────────┐
│ source files                                                       │
│ CSV/TSV/XLS/XLSX parsing                                          │
│ workbook/header selection                                         │
│ source mapping                                                     │
│ canonical lead rows + provenance                                  │
│ contact selection                                                  │
│ normalization / validation / deduplication                        │
│ Ready / Review / Blocked review                                   │
│ destination export build + preview                                │
│ generated CSV/TSV/XLSX/XLS files                                  │
└────────────────────────────────────────────────────────────────────┘
                         │ configuration only
                         ▼
┌──────────────────── Supabase control plane ────────────────────────┐
│ authentication                                                     │
│ profiles                                                           │
│ organizations / memberships / invitations                         │
│ contact preferences                                                │
│ source mapping templates                                           │
│ destination export templates                                       │
└────────────────────────────────────────────────────────────────────┘
```

Raw lead rows are intentionally absent from the hosted schema.

## Layers

### 1. Clean Core — `src/core/`

Framework-independent TypeScript containing:

- canonical lead model;
- stable record identity and provenance;
- typed email/phone contact points;
- normalization;
- phone normalization;
- validation;
- personal-email policy;
- deduplication;
- quality classification;
- configurable processing strategies;
- deterministic processing pipeline.

`CanonicalLead.customFields` is the extension point for source/customer fields that do not belong in the standard DemandLint B2B lead schema.

The selected primary `email` and `phone` values remain backward-compatible convenience fields; typed alternatives preserve the complete contact evidence.

### 2. Application — `src/application/`

Owns product use cases and provider-neutral workflow contracts, including:

- import-session model;
- workbook sheet selection evidence;
- parsed-table analysis;
- source mapping contracts;
- quality-review shaping;
- destination export-template model/build validation;
- export file naming;
- account/workspace domain contracts;
- persistence/provider ports.

Application may depend on the Clean Core but must not depend on React.

### 3. Adapters — `src/adapters/`

Translate external formats/runtime APIs into DemandLint contracts.

Current adapter families:

- `csv/` — delimited file parsing;
- `xlsx/` — XLSX/XLS workbook parsing through SheetJS;
- `table/` — table parser contracts/dispatch;
- `export/` — serialization/build helpers;
- `browser/` — file reads/downloads and local repositories;
- `supabase/` — hosted accounts/preferences/template repositories.

Future CRM connectors belong here behind provider-neutral Application ports.

### 4. Composition — `src/composition/`

The only layer that wires use cases to concrete runtime adapters.

Examples:

- browser import;
- browser export;
- account backend selection;
- contact preference persistence;
- mapping template persistence;
- export template persistence.

React should call composition functions rather than importing Supabase/file adapters directly.

### 5. UI — `src/components/` + `src/App.tsx`

React owns presentation and workflow orchestration only.

Current major UI modules include:

- authentication/account gate;
- upload;
- source mapping;
- mapping template management;
- contact preferences;
- Data Health review;
- destination export preparation;
- workspace administration.

Do not add deterministic data rules, authorization enforcement or persistence logic to React components.

## Import architecture

### Table formats

Current inputs:

- CSV
- TSV
- XLSX
- legacy XLS

### Workbook pipeline

Excel files are treated as workbooks, not as “first worksheet = dataset”.

`src/adapters/xlsx/parseXlsx.ts`:

1. validates the expected file signature;
2. parses all workbook sheets locally;
3. scans candidate header rows (currently the first 50 rows of each sheet);
4. evaluates source-mapping evidence;
5. builds sheet metadata;
6. automatically selects the strongest usable lead table unless a sheet is explicitly requested;
7. exposes all sheet summaries in metadata.

A user can manually select another sheet. Downstream mapping and analysis must be reset/recomputed when worksheet context changes.

Sheets are never silently merged.

## Source mapping architecture

Source mapping converts arbitrary incoming headers into canonical DemandLint semantics.

Example:

```text
Correo electrónico → email
Entreprise          → company
Portable            → phoneMobile
```

The mapping engine is deterministic and multilingual for current EN/FR/ES/PT aliases. Manual correction remains authoritative.

Organization-scoped mapping templates persist recurring source layouts through a repository port with browser-local and Supabase implementations.

## Canonical processing pipeline

```text
Parsed source rows
  ↓
Confirmed source mapping
  ↓
Canonicalization + stable provenance
  ↓
Typed contact extraction / preference selection
  ↓
Normalization
  ↓
Validation strategy
  ↓
Duplicate strategy
  ↓
Ready / Review / Blocked classification
  ↓
ProcessedDataset + issues + stats
```

Issues are tied to stable `recordId` plus provenance rather than only row number.

## Destination export architecture

V0.3 makes destination preparation a separate fourth workflow step.

```text
Processed canonical leads
  ↓
Destination ExportTemplate
  ├── exact ordered headers
  ├── canonical/custom sources
  ├── constants
  ├── prompted per-export parameters
  ├── deliberately empty columns
  ├── default values
  ├── safe value mappings
  └── output formatting
  ↓
Deterministic build result
  ├── ordered columns
  ├── preview rows
  └── validation issues
  ↓
CSV / semicolon CSV / TSV / XLSX / BIFF8 XLS
```

Source mapping and destination export templates are separate models and must remain separate.

Built-in provider presets are data/configuration starting points, not provider logic in the Clean Core.

See `docs/export-templates.md`.

## XLS / XLSX behavior

XLSX and XLS inputs share workbook-selection behavior.

Legacy `.xls` export is an actual BIFF8 file and is constrained by the format:

- 65,536 total rows;
- 256 columns.

DemandLint blocks an oversized XLS export and directs the user toward XLSX or delimited output. Never generate CSV bytes with an `.xls` filename.

## Accounts and organizations

The current tenancy model is:

```text
User ← Membership → Organization
```

Current roles:

- owner
- admin
- member

A user may belong to multiple organizations. The active organization scopes reusable configuration.

Hosted V0.2.2+ authentication uses Supabase passwordless work-email OTP. The account control plane persists across devices while lead processing remains browser-local.

Google and Microsoft provider hooks are feature-flagged but currently disabled in production until their full OAuth flows are configured and validated.

Enterprise OIDC/SAML SSO is intentionally post-V1 unless scope changes.

## Supabase control plane

Current migration sequence:

```text
20260820_000001_hosted_accounts.sql
20260820_000002_member_management.sql
20260820_000003_workspace_role_management.sql
20260820_000004_account_deletion_permissions.sql
20260821_000005_export_templates.sql
```

Persisted product tables include:

- profiles;
- organizations;
- organization memberships;
- organization invitations;
- contact preferences;
- mapping templates;
- export templates.

Row Level Security and private helper/RPC functions are the authorization boundary. Client-side role checks are only UX controls.

Applied production migrations are immutable history; add a new migration for future schema changes.

## Workspace invitations

Workspace invitations are delivered by an authenticated Supabase Edge Function through Resend.

Server-only values such as the Resend API key remain Edge Function secrets and never enter the Vite/browser bundle.

Invitation/member/role behavior must remain enforced server-side even when the UI hides unavailable actions.

## Role hierarchy

The current V0.2.3 hierarchy is asymmetric by design:

- owner may promote/demote active admins/members;
- owner may transfer ownership atomically to an active admin;
- ownership transfer demotes the former owner to admin;
- admin may promote members and revoke members;
- admin may demote their own account;
- admin may not modify/revoke other admins;
- owner may not self-demote outside ownership transfer;
- database rules preserve at most one owner per organization.

Do not duplicate this authorization model only in React.

## Multi-source import foundation

The application model can hold several import sources and provenance is already multi-source-safe.

The current user workflow remains single-source.

Therefore:

- multi-source support is an architectural foundation;
- visible merge/conflict resolution is **not** an implemented user feature;
- it is intentionally post-V1 unless roadmap priority changes.

Future merge work should preserve source-specific provenance and make conflicts explicit.

## Destination connector foundation

A provider-neutral destination connector port exists in the architecture direction for future:

- connection testing;
- destination schema discovery;
- mapped record push;
- per-record success/failure evidence.

No direct Salesforce/HubSpot/Dynamics/Marketo API push is part of the current V0.3 or approved V1 scope.

When connectors are eventually added, credentials and refresh tokens belong server-side and the Clean Core must remain unaware of provider SDKs.

## Error philosophy

DemandLint must fail visibly and recoverably.

- deterministic corrections create explainable information/evidence;
- ambiguous conditions create warnings;
- invalid required data creates blocking errors;
- duplicate/conflict evidence preserves source provenance;
- review/blocked rows remain inspectable;
- parsers must distinguish unsupported/empty/malformed input from valid empty data;
- destination validation must block ambiguous output rather than silently guessing.

## Privacy and observability

The local-first boundary applies to future V0.7 observability too.

Product telemetry may capture privacy-safe operational signals such as:

- workflow stage reached;
- file type;
- size/row-count buckets;
- parser/error codes;
- timing buckets;
- success/failure counts;
- template/recipe reuse events.

Do not send raw lead values, email addresses, phone numbers, company names or generated file contents merely for analytics/support diagnostics.

## Testing architecture

Current tests are organized by ownership:

- `tests/core/` — deterministic domain rules;
- `tests/application/` — workflow/use-case contracts;
- `tests/adapters/` — parsing, serialization, repositories;
- `tests/architecture/` — dependency-boundary enforcement;
- `tests/mapping/` — mapping behavior;
- `tests/fixtures/` — file-shaped regression inputs.

V0.4 must add browser-level end-to-end coverage for critical flows. E2E tests should complement, not replace, lower-level deterministic tests.

## Deployment architecture

### Frontend

GitHub Pages deployment from `main`:

```text
push main
  ↓
npm ci
  ↓
npm run ci
  ↓
Vite dist/
  ↓
GitHub Pages
  ↓
demandlint.com
```

Production workflow: `.github/workflows/deploy-pages.yml`.

### Hosted control plane

Supabase schema/function changes require explicit deployment independent of the static frontend build.

Browser variables contain only public/publishable Supabase configuration and feature flags. Never use a service-role/secret key in `VITE_*`.

### Invitation email

Supabase Edge Function + Resend, with server-side secrets.

## Current V1-readiness technical priorities

The architecture does **not** require a rewrite for V1. The main engineering priorities are hardening and evidence:

1. representative anonymized/minimized real-file fixture corpus;
2. browser E2E tests for the critical workflow;
3. robust parser/auth/export error and recovery states;
4. RLS/cross-organization security validation;
5. performance baselines on realistic file sizes;
6. UI decomposition only where it reduces regression risk (`App.tsx`, `WorkspaceSettings.tsx`, `ExportPreparation.tsx` are already large);
7. privacy-safe observability;
8. no P0/P1 defects before the V1 release candidate.

Avoid gratuitous rewrites. Add new capability behind existing boundaries and use an ADR when changing a boundary.