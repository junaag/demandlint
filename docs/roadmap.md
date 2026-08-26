# DemandLint — Product & Platform Roadmap

This roadmap separates completed releases from the approved V1-readiness sequence.

The V1 strategy is **reliability, self-service and repeatability before feature expansion**.

## Completed releases

### V0.0.1 — Clean Core

- canonical lead model;
- normalization;
- required-field validation;
- email validation;
- personal email policy;
- duplicate detection by normalized email;
- Ready / Review / Blocked classification;
- unit tests;
- CI.

### V0.0.2 — File ingestion

- CSV adapter;
- XLSX adapter;
- dataset preview;
- file-size and parsing errors.

### V0.0.3 — Column mapping

- canonical field dictionary;
- deterministic aliases;
- confidence levels;
- EN / FR / ES / PT coverage;
- manual correction UI.

### V0.0.4 — Upload & mapping UI

- React/Vite application;
- local upload flow;
- file metadata;
- mapping confirmation.

### V0.0.5 — Data Health & export

- data health summary;
- issue filters;
- row-level review;
- visible automatic fixes;
- clean/review export.

### V0.1.0 — First user-testable MVP

A marketer can upload a real CSV/XLSX lead file, map fields, review issues and export a clean dataset entirely in the browser.

### V0.1.1 — Architecture hardening

- stable record identity and multi-source provenance;
- `ImportSession` model;
- extensible custom-field contracts;
- separate source and destination mapping contracts;
- authentication and organization ports;
- mapping-template repository port;
- destination connector port;
- configurable validation/deduplication strategies;
- architecture-boundary tests;
- reproducible lockfile/CI builds;
- ADRs.

### V0.1.2 — Multi-sheet XLSX

- inspect every worksheet locally;
- rank candidate lead tables from deterministic mapping evidence;
- automatically select the strongest sheet;
- expose all workbook sheets and allow manual override;
- reset downstream mapping/analysis after a switch;
- regression coverage.

### V0.1.3 — Contact Data Intelligence

- typed professional/secondary/personal emails;
- typed mobile/direct/switchboard phones;
- retain alternative contact values and evidence;
- configurable deterministic preference ordering;
- E.164 phone normalization;
- numeric Excel phone handling/extensions;
- organization contact preferences;
- complete contact export options.

### V0.2.0 — Account workspace preview

- local account/workspace UX;
- organization-scoped preferences;
- saved source mapping templates;
- owner/admin/member model preview;
- browser-local lead processing preserved.

### V0.2.1 — Authentication UX

- work-email registration;
- separate returning-user login;
- authentication/public-route redesign;
- legal pages;
- English public account flow.

### V0.2.2 — Hosted passwordless accounts

- Supabase passwordless work-email OTP;
- persisted profiles/organizations/memberships;
- Row Level Security;
- cross-device preferences and source mapping templates;
- hosted legal/data-boundary updates;
- Google/Microsoft hooks behind disabled feature flags.

### V0.2.3 — Workspace administration

- transactional invitation email via protected Edge Function;
- invitation resend/cancellation;
- member access revocation;
- owner/admin/member role management;
- atomic ownership transfer;
- hardened account deletion permissions.

### V0.3.0 — Destination-ready exports

- fourth **Prepare export** step;
- source mapping kept independent from destination export templates;
- organization-scoped destination templates;
- exact headers and column order;
- canonical/custom sources;
- constants;
- per-export prompted values;
- deliberately empty columns;
- defaults, safe value mappings and output formatting;
- exact five-row preview and required-output validation;
- build templates from CSV/TSV/XLSX/XLS samples;
- Generic CRM / Salesforce / HubSpot / Marketo / Dynamics starting points;
- CSV / semicolon CSV / TSV / XLSX / true BIFF8 XLS export;
- true legacy XLS import;
- multi-sheet behavior extended to XLS;
- export-template metadata synchronized through Supabase while lead rows remain local.

V0.3.0 release PR `#28` records 102 passing tests, passing typecheck/build, npm audit with 0 vulnerabilities and the export-template production migration/RLS verification.

---

# Approved path to V1

## V0.4 — Reliability hardening

### Goal

Prove the existing V0.3 workflow against real-shaped data and establish a regression safety net before expanding product scope.

### Scope

#### Real-file regression corpus

Create and maintain anonymized/minimized fixtures for high-risk shapes, including:

- workbook with dashboard/statistics sheets before the lead sheet;
- header row below titles/blank rows;
- malformed and empty inputs;
- unusual/duplicate headers;
- numeric phone cells and extensions;
- mixed date representations;
- delimiter/encoding variants;
- wide exports;
- source files with several contact columns;
- legacy XLS;
- export templates with blank columns/constants/prompts/required fields;
- cases near relevant legacy/browser limits.

When a real customer/event file reveals a defect, reduce it to the smallest safe fixture that reproduces the issue and keep it as a regression test.

#### Browser end-to-end tests

Add a browser-level E2E suite covering the critical product path:

```text
account/session
→ workspace
→ import
→ workbook selection when relevant
→ source mapping
→ quality review
→ export template
→ prompted values
→ preview
→ download initiation
```

Also cover important recovery paths:

- invalid/unsupported file;
- wrong worksheet then manual correction;
- incomplete mapping;
- missing required export parameter;
- duplicate output headers;
- sign-out/session restoration;
- hosted configuration failure states.

#### Error and recovery hardening

- make parsing errors actionable;
- avoid dead-end states;
- preserve user configuration where safe after recoverable errors;
- distinguish file-format problems from data-quality problems;
- ensure loading/submission states cannot trigger duplicate actions;
- verify reload-safe production routes.

#### Security validation

- validate cross-organization isolation for every exposed Supabase table;
- validate member/admin/owner operation boundaries;
- verify invitation and account lifecycle operations;
- review server-side functions/RPCs and RLS policies;
- ensure no raw lead values are accidentally persisted or logged server-side.

#### Performance baseline

Measure representative import/export sizes in modern desktop browsers and identify where Web Workers/streaming would become necessary. Do not optimize prematurely without evidence.

### V0.4 exit gate

- `npm run ci` green;
- critical E2E journey green;
- representative file corpus in regression tests;
- security/tenant-isolation checks documented;
- no unresolved P0/P1 reliability defects discovered by the hardening pass.

---

## V0.5 — Self-service UX

### Goal

A marketer unfamiliar with the codebase can complete the workflow and recover from common mistakes without developer guidance.

### Scope

- clearer onboarding and first-run guidance;
- stronger empty states and progressive disclosure;
- explain automatic worksheet selection and make override obvious when needed;
- make source-mapping confidence/corrections understandable;
- improve Data Health prioritization and remediation flow;
- reduce cognitive load in export-template creation/editing;
- clearly distinguish constants from values requested for each export;
- show destination validation issues next to the relevant column/value;
- strengthen success states and “what happens next” guidance;
- keyboard/accessibility/responsive review;
- decompose large React orchestration modules only where it materially reduces UX/regression risk.

### V0.5 exit gate

Run structured usability tests with **at least five representative users**. They should be able to complete the main import-to-export flow with minimal intervention, and recurring confusion should be fixed before moving on.

---

## V0.6 — Recipes

### Goal

Turn repeated operational workflows into a reusable organization asset rather than a sequence users rebuild every time.

### Recipe concept

A Recipe should bundle/reference reusable configuration for a recurring workflow, for example:

```text
“France event leads → Marketo”
  ├── source mapping template
  ├── contact preferences
  ├── deterministic quality settings/policy
  └── destination export template
```

A Recipe stores configuration, not lead rows.

### Scope

- create/save/rename/delete organization-scoped Recipes;
- compose existing mapping/contact/quality/export configuration without duplicating raw data;
- apply a Recipe when starting a recurring import;
- clearly surface any parts that still require per-export input, such as Program Name;
- handle recipe/template changes without silently corrupting historical expectations;
- make Recipe ownership/sharing consistent with workspace permissions.

### V0.6 exit gate

Demonstrate Recipe reuse across repeated real workflows with materially less manual reconfiguration than an unsaved import. Validate that users understand what is saved versus what must still be supplied per run.

---

## V0.7 — Privacy-safe observability

### Goal

Understand where the product succeeds or fails in real use without collecting customer lead values.

### Scope

Instrument product/operational signals such as:

- workflow step reached;
- successful/failed import;
- file type and non-identifying size/row-count buckets;
- workbook sheet-count/selection behavior;
- mapping correction counts;
- Ready/Review/Blocked counts or buckets;
- export-template usage/reuse;
- Recipe reuse;
- export format;
- error codes/categories;
- stage timing/performance buckets.

Do **not** send raw lead values, email addresses, phone numbers, company names or generated output contents for analytics.

Add enough diagnostic context to distinguish user/data errors from product defects.

### V0.7 exit gate

For a failed or abandoned workflow, the team can identify the failing stage/error category and measure the main product funnel without accessing raw lead data.

---

## V0.8 — Product validation

### Goal

Collect evidence that DemandLint solves the real workflow better than the current spreadsheet process.

### Scope

Run structured tests using representative event/partner/import workflows and capture:

- source format and row count;
- time to destination-ready file in DemandLint;
- comparison with the current manual spreadsheet workflow where feasible;
- manual source-mapping corrections;
- export-template corrections;
- rows requiring review;
- errors DemandLint caught;
- errors DemandLint missed;
- user confidence in the output;
- repeat use / Recipe reuse;
- willingness to use DemandLint for the next import.

Use GitHub issue `#12` as historical seed material, but evolve the protocol for the current V0.3+ product rather than treating it as a V0.1-only checklist.

### V0.8 exit gate

There is documented multi-user evidence for the core value proposition and the important product KPIs can be measured. Any systematic correctness problem discovered by validation returns to hardening before RC.

---

## V0.9 — Release Candidate

### Goal

Freeze V1 scope and remove release risk.

### Scope

- bug-fix and polish only unless a release-blocking gap requires otherwise;
- complete production smoke-test checklist;
- verify database migration history and production parity;
- verify invitation/auth flows;
- verify all supported import/export formats;
- verify Recipes and workspace persistence;
- verify privacy/data-boundary claims;
- accessibility/responsive pass on critical screens;
- dependency/security audit;
- final documentation and onboarding review;
- remove stale version language and dead experimental paths.

### V0.9 exit gate

- no open P0/P1 defects;
- critical E2E suite green;
- production smoke test green;
- migration/RLS checks green;
- V1 user documentation current;
- release evidence from V0.8 accepted.

---

## V1.0 — Reliable self-service DemandLint

### V1 promise

A marketing user can repeatedly turn a messy event/partner lead file into a trustworthy destination-ready CRM import without relying on manual spreadsheet reconstruction or developer assistance.

V1 includes the proven intake → quality → review → exact export workflow, secure workspaces, reusable configuration and Recipes, plus the hardening/observability required to operate it responsibly.

V1 does **not** require every possible platform integration.

---

# Explicitly post-V1 unless reprioritized

## Visible multi-source imports

Architecture already supports multiple sources/provenance, but the user-facing merge/conflict-resolution workflow is deferred until after V1.

Future work may include:

- multiple files per session;
- cross-source duplicates;
- deterministic merge rules;
- explicit conflict resolution;
- provenance-aware review.

## Direct CRM destinations

Provider-neutral connector boundaries exist, but direct push is deferred until product demand justifies the operational/security complexity.

Potential future work:

- connector credential service;
- destination schema discovery;
- Salesforce / HubSpot / Dynamics / Marketo adapters;
- per-record push evidence;
- audit history.

## Enterprise identity

- OIDC/SAML SSO;
- advanced organization policy controls;
- custom roles/audit history.

Google/Microsoft login hooks may be completed independently if they become a validated pre-V1 blocker, but the current production flags remain disabled until each full OAuth flow is configured and tested.

## AI assistance

AI may later assist with ambiguous mapping or explanations behind an adapter boundary. It must not become the source of truth for deterministic quality decisions.

## Other data formats / transformation platform features

ODS, XML, JSON workflows and a general-purpose transformation language remain outside V1 until real customer evidence makes them a priority.

---

# Roadmap governance

A feature is not “done” because code exists. Update `docs/current-state.md` only when the end-user capability and required tests/deployment steps are actually complete.

If a roadmap change affects a product invariant, privacy boundary, tenancy/security model or layer boundary, update `docs/decisions.md` and add an ADR when appropriate.