# DemandLint — Project Handover

This document is the single entry point for a developer taking over DemandLint with ChatGPT, Codex or another coding agent.

## 1. Project coordinates

- Repository: `junaag/demandlint`
- Default branch: `main`
- Current product version: **0.3.0**
- Reference merge commit: `c928442ba0256236e5ebfd88d514439b8971efc2`
- V0.3.0 release PR: `#28` — `Release V0.3.0 — destination-ready exports`
- Production domain: `https://demandlint.com`
- Hosting: GitHub Pages
- Hosted control plane: Supabase
- Invitation email delivery: Supabase Edge Function + Resend

The V0.3.0 PR records the release validation as **102 passing tests, TypeScript typecheck passing, production build passing and npm audit reporting 0 vulnerabilities**. This handover audit did not independently rerun those commands because the audit runtime had no external network access; use `npm run ci` after cloning as the first local verification.

## 2. Product in one paragraph

DemandLint prevents poor lead data from reaching a CRM or Marketing Automation platform. A marketer signs in, uploads CSV/TSV/XLSX/XLS data, confirms the source mapping, runs deterministic data-quality checks, reviews Ready/Review/Blocked rows, then generates an exact destination-specific file using reusable export templates. Uploaded lead data and generated output stay in the browser; Supabase stores only account/workspace data and reusable configuration.

## 3. Read these files before coding

1. `AGENTS.md` — non-negotiable rules for Codex/agents
2. `docs/current-state.md` — factual implementation matrix and known gaps
3. `docs/product.md` — current product scope and user promise
4. `docs/architecture.md` — layer boundaries and runtime architecture
5. `docs/data-model.md` — browser domain model and Supabase control-plane model
6. `docs/export-templates.md` — source-vs-destination mapping and V0.3 export semantics
7. `docs/roadmap.md` — approved path from V0.3 to V1
8. `docs/decisions.md` and `docs/adr/` — decisions that should not be repeatedly reopened
9. `supabase/README.md` — hosted environment/deployment details

## 4. Local setup

Prerequisites:

- Node.js 22 recommended (matches GitHub Pages workflow)
- npm
- a browser
- browser-safe Supabase project values for hosted-account development

```bash
git clone https://github.com/junaag/demandlint.git
cd demandlint
npm ci
cp .env.example .env.local
npm run ci
npm run dev
```

The application normally runs on Vite's default local URL (`http://localhost:5173`).

`.env.local` requires only browser-safe values:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_AUTH_GOOGLE_ENABLED=false
VITE_AUTH_MICROSOFT_ENABLED=false
```

Never expose Supabase service-role credentials, SMTP credentials, Resend keys or OAuth client secrets in Vite/browser variables.

## 5. Current user workflow

```text
1. Register / sign in with work-email OTP
2. Select an organization workspace
3. Upload CSV / TSV / XLSX / XLS
4. If workbook: inspect + auto-select lead sheet; user may override
5. Detect and confirm source column mapping
6. Optionally apply/save organization source-mapping template
7. Classify and prioritize multiple email/phone values
8. Normalize, validate and deduplicate
9. Review Ready / Review / Blocked rows
10. Select/create destination export template
11. Fill per-export requested values
12. Preview exact output and resolve blocking template issues
13. Export CSV / semicolon CSV / TSV / XLSX / true BIFF8 XLS
```

## 6. Architecture at a glance

```text
React UI
   ↓
Composition
   ↓
Application use cases + ports
   ↓
Clean Core

Adapters implement external concerns:
- CSV / XLS / XLSX parsing
- browser downloads/storage
- Supabase persistence/auth boundary
- future provider connectors
```

Two data planes must remain separate:

```text
BROWSER DATA PLANE
source files
parsed rows
canonical leads
quality issues
review state
output previews
export files

CLOUD CONTROL PLANE (SUPABASE)
profiles
organizations
memberships
invitations
contact preferences
source mapping templates
export templates
```

Do not move raw lead data into Supabase as an incidental implementation shortcut.

## 7. Important implementation locations

### Application shell / workflow

- `src/App.tsx`

### Clean Core

- `src/core/domain.ts`
- `src/core/processDataset.ts`
- `src/core/normalization.ts`
- `src/core/phoneNormalization.ts`
- `src/core/validation.ts`
- `src/core/deduplication.ts`
- `src/core/mapping/`

### Import / workbook selection

- `src/application/import/`
- `src/adapters/csv/`
- `src/adapters/xlsx/parseXlsx.ts`
- `src/adapters/table/`
- `src/composition/browserImport.ts`

### Source mapping

- `src/application/mapping/`
- `src/core/mapping/`
- `src/components/MappingPanel.tsx`
- `src/components/MappingTemplatesPanel.tsx`

### Quality review

- `src/application/qualityReview.ts`
- `src/components/DataHealthReview.tsx`

### Destination export templates

- `src/application/exportTemplates.ts`
- `src/components/ExportPreparation.tsx`
- `src/composition/browserExportTemplates.ts`
- `src/adapters/browser/localExportTemplateRepository.ts`
- `src/adapters/supabase/supabaseExportTemplateRepository.ts`

### File generation

- `src/composition/browserExport.ts`
- `src/adapters/export/`
- `src/adapters/browser/downloadTextFile.ts`
- `src/adapters/browser/downloadXlsxFile.ts`
- `src/adapters/browser/downloadXlsFile.ts`

### Accounts / workspaces

- `src/application/accounts/`
- `src/components/AccountGate.tsx`
- `src/components/WorkspaceSettings.tsx`
- `src/composition/browserAccounts.ts`
- `src/adapters/supabase/`
- `supabase/migrations/`
- `supabase/functions/`

## 8. Deployment

Frontend deployment is automatic from `main` through:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-pages.yml`

The Pages workflow uses Node 22, runs `npm ci`, then `npm run ci`, then deploys `dist/`.

`public/CNAME` points to `demandlint.com`.

Supabase changes are **not** automatically inferred from frontend deployment. A database change requires a new migration and an explicit production migration step. Edge Function changes require function deployment and relevant server-side secrets.

## 9. What is implemented versus intentionally absent

See `docs/current-state.md` for the detailed matrix. The most important distinction for takeover is:

### Implemented in V0.3

- passwordless hosted account flow;
- multi-tenant organizations/workspaces;
- invitations and owner/admin/member lifecycle;
- organization-scoped preferences;
- reusable source mapping templates;
- CSV/TSV/XLSX/XLS ingestion;
- automatic + manual workbook sheet selection;
- deterministic multilingual source-column mapping;
- contact-role intelligence and E.164 normalization;
- data-quality review;
- reusable export templates;
- exact ordered output, constants, prompts, blanks, defaults/fallbacks/value mappings/formatting;
- built-in generic/Salesforce/HubSpot/Marketo/Dynamics template starting points;
- CSV/semicolon CSV/TSV/XLSX/true XLS export;
- Supabase persistence for reusable export templates.

### Not V1 scope unless reprioritized

- visible multi-file merge workflow;
- direct Salesforce/HubSpot/Dynamics/Marketo API push;
- enterprise OIDC/SAML SSO;
- AI as a source of truth for deterministic quality decisions.

Google/Microsoft auth hooks exist but the production flags remain disabled until the provider flows are fully configured and validated.

## 10. Current priority: V1 readiness, not feature expansion

The approved release sequence is:

```text
V0.4 Hardening
V0.5 Self-service UX
V0.6 Recipes
V0.7 Observability
V0.8 Validation
V0.9 Release Candidate
V1.0
```

The immediate work is a real-file reliability program: broaden the anonymized corpus, add browser E2E tests, harden failure states and validate Supabase/RLS behavior. Do not jump directly to connectors, SSO or multi-source UI simply because application contracts already anticipate them.

## 11. First-day checklist for the next developer

- Clone at the current `main` HEAD and record the SHA.
- Run `npm ci && npm run ci`.
- Open `demandlint.com` and execute one complete smoke test.
- Register/sign in using a test work email.
- Verify workspace switching and saved source/export templates.
- Test a delimited file and a multi-sheet workbook.
- Confirm manual sheet override resets mapping/analysis appropriately.
- Exercise the Marketo preset with the prompted `Program Name` value.
- Export one CSV, one XLSX and one XLS.
- Read the only currently open GitHub issue (`#12`, real-user test checklist).
- Start V0.4 work from `docs/roadmap.md`; do not infer the next feature from old chat history.

## 12. Handover rule

A future maintainer should not need access to the original ChatGPT conversations to understand the project. If a product or architecture decision is required to implement work correctly, capture it in the repository as an ADR, current-state update, roadmap update or focused feature document before ending the task.