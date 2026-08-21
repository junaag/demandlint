# AGENTS.md — DemandLint

This file is the operating contract for AI coding agents and new contributors working on DemandLint.

## Start here

Before changing code, read in this order:

1. `docs/handover.md`
2. `docs/current-state.md`
3. `docs/product.md`
4. `docs/architecture.md`
5. `docs/data-model.md`
6. `docs/export-templates.md`
7. `docs/roadmap.md`
8. `docs/decisions.md` and `docs/adr/`

Current reference baseline: **V0.3.0**, `main` merge commit `c928442ba0256236e5ebfd88d514439b8971efc2`.

## What DemandLint is

DemandLint is a local-first pre-flight and data-quality application for CRM / Marketing Automation imports.

The canonical workflow is:

```text
Source file
  ↓
Workbook / delimited-file parsing
  ↓
Source mapping
  ↓
Canonical lead dataset
  ↓
Deterministic normalization / validation / deduplication
  ↓
Ready / Review / Blocked quality review
  ↓
Destination export template
  ↓
Exact output preview + destination validation
  ↓
CSV / semicolon CSV / TSV / XLSX / true BIFF8 XLS
```

## Commands

Use the lockfile. CI uses Node 22.

```bash
npm ci
npm run typecheck
npm test
npm run build
# Equivalent validation bundle:
npm run ci
```

Local development:

```bash
cp .env.example .env.local
npm run dev
```

Only browser-safe Supabase values belong in `VITE_*`. Never add a service-role key, SMTP credential, Resend API key, OAuth secret or other server secret to Vite variables or browser code.

## Non-negotiable architecture rules

### 1. Source mapping and destination export templates are different concepts

Source mapping answers: **what does the incoming file mean?**

Destination export templates answer: **what exact file must the target system receive?**

Do not merge these models or make source parsing depend on a CRM destination.

### 2. Keep the Clean Core provider-neutral

`src/core/` must remain framework-independent and deterministic. It must not import:

- React;
- browser APIs;
- CSV/XLS/XLSX libraries;
- Supabase;
- CRM SDKs;
- AI providers.

Do not add `Salesforce`, `Marketo`, `HubSpot`, `Dynamics`, or another provider as business logic in the Clean Core when the behavior can be expressed as a generic mapping, template, strategy or adapter.

### 3. Preserve dependency direction

```text
UI → Composition → Application ports/use cases → Clean Core
                    ↑
                 Adapters
```

React should not contain data-quality, persistence or authorization rules. The composition layer wires ports to adapters.

### 4. Raw lead data stays browser-local

Supabase is the control plane, not the lead-data plane.

Allowed cloud-persisted data includes account/workspace metadata and reusable configuration such as preferences, source mapping templates and export templates.

Do **not** persist uploaded files, parsed lead rows, canonical leads, review rows, export previews or generated export contents in Supabase unless an explicit future architecture decision changes this boundary.

### 5. Never silently lose data

Bad or ambiguous rows must remain visible and reviewable. Preserve provenance. Deterministic fixes must remain explainable.

### 6. Workbook behavior is intentional

XLSX and XLS workbooks may contain several sheets. DemandLint must:

- inspect candidate sheets;
- deterministically choose the strongest lead table;
- expose the chosen sheet;
- allow manual override;
- reset/re-run mapping and analysis when the sheet changes;
- never silently merge sheets.

### 7. Destination exports must be exact and deterministic

Templates may define:

- exact headers;
- exact column order;
- canonical/custom-field sources;
- constants;
- values prompted once per export;
- deliberately empty columns;
- defaults and fallbacks;
- safe value mappings;
- text/date/datetime/number/boolean formatting;
- required values.

Duplicate output headers and missing required values must block export. Legacy `.xls` is true Excel 97–2003 BIFF8 and is constrained to 65,536 total rows and 256 columns.

### 8. Treat database authorization as server-side responsibility

UI role checks are usability controls, not authorization. Supabase RLS/private functions/RPCs are the security boundary.

Applied migrations under `supabase/migrations/` are immutable history. Add a new migration rather than rewriting a production migration unless the task explicitly concerns an unreleased branch.

### 9. Keep OAuth/SSO disabled until truly configured

Google and Microsoft provider hooks exist but production feature flags are currently disabled. Do not flip them on without completing provider configuration and validating the full authentication flow.

## Testing expectations

Every behavior change should include the smallest useful regression test at the appropriate level:

- `tests/core/` for deterministic data rules;
- `tests/application/` for use cases/contracts;
- `tests/adapters/` for file/persistence adapters;
- `tests/architecture/` for dependency boundaries.

V0.4 adds browser-level end-to-end coverage; do not substitute E2E tests for core/application unit tests.

When fixing a real customer-file defect, add an anonymized/minimized fixture or programmatic workbook reproducer before or with the fix.

## Current V1 scope discipline

The approved path is reliability-first:

```text
V0.4 hardening
→ V0.5 self-service UX
→ V0.6 Recipes
→ V0.7 observability
→ V0.8 validation
→ V0.9 release candidate
→ V1.0
```

Until V1, prioritize reliability, autonomy, repeatability and measurable validation over feature expansion.

Explicitly post-V1 unless reprioritized by the product owner:

- visible multi-source merge workflow;
- direct CRM connectors/push;
- enterprise OIDC/SAML SSO;
- AI-dependent quality decisions.

## Change hygiene

Before coding:

1. identify the layer that owns the behavior;
2. check existing ports/adapters before adding a parallel abstraction;
3. inspect relevant tests and release/ADR documentation;
4. state whether the change modifies a product invariant or only an implementation detail.

Before declaring work complete:

1. run `npm run ci`;
2. add/update tests and fixtures;
3. update `docs/current-state.md` if feature status changed;
4. update `docs/roadmap.md` if a V1 gate changed;
5. add an ADR when changing an architectural boundary;
6. document any Supabase migration/deployment step.

Production deployment is driven by pushes to `main` through `.github/workflows/deploy-pages.yml` and serves the custom domain `demandlint.com`.