# DemandLint — Decision Register

This register summarizes decisions that materially affect future implementation. Detailed historical architecture decisions also live in `docs/adr/` and release notes.

Use this file to avoid reopening settled questions merely because a new contributor or AI agent did not see the original discussions.

## D-001 — Local-first lead processing

**Status:** Accepted / binding

Uploaded lead files, parsed rows, canonical leads, quality issues, previews and generated export contents are processed in the browser.

Supabase is the account/configuration control plane, not the raw lead-data plane.

Why:

- minimizes customer-data exposure;
- keeps the product useful without server-side data processing;
- preserves a simple privacy story;
- isolates SaaS account growth from the deterministic cleaning engine.

Related: `docs/adr/0001-local-first.md`.

## D-002 — Clean Core is framework/provider independent

**Status:** Accepted / binding

Deterministic mapping/normalization/validation/deduplication logic belongs in framework-independent TypeScript and must not depend on React, browser APIs, persistence SDKs, CRM SDKs or AI.

Related: `docs/adr/0002-clean-core.md`.

## D-003 — AI is optional, never required for deterministic quality

**Status:** Accepted / binding

Core quality decisions must remain reproducible and explainable without AI. AI may later assist with ambiguous tasks behind an adapter boundary but must not become the authoritative path for deterministic validation.

Related: `docs/adr/0003-no-mandatory-ai-v01.md`.

## D-004 — Platform boundaries before feature-specific coupling

**Status:** Accepted / binding

Authentication, organizations, persistence and destination providers sit behind application ports/adapters rather than being introduced into the Clean Core.

Related: `docs/adr/0004-platform-boundaries.md`.

## D-005 — A workbook is not assumed to equal its first worksheet

**Status:** Implemented since V0.1.2; extended to XLS in V0.3

Excel workbooks may contain dashboards, statistics, instructions and lead data on different sheets.

DemandLint must:

- inspect all sheets locally;
- detect plausible header rows;
- rank candidate lead tables using deterministic mapping evidence;
- auto-select the strongest candidate;
- expose sheet information to the user;
- allow manual override;
- re-run/reset downstream mapping and analysis after a sheet change;
- never silently merge sheets.

The real-world trigger for this decision was an event workbook where useful leads were on the second worksheet rather than the first.

## D-006 — Source mapping and destination export templates are separate

**Status:** Accepted / implemented in V0.3

Source mapping answers **what the incoming data means**.

Destination export templates answer **what exact file the target system requires**.

This separation is one of DemandLint's core product invariants. It allows arbitrary sources to be normalized once and reused for several target systems without contaminating the canonical model with CRM-specific shapes.

## D-007 — Destination preparation is a first-class fourth workflow step

**Status:** Accepted / implemented in V0.3

Current product flow:

```text
Upload → Map fields → Review quality → Prepare export
```

Preparing an exact CRM-ready file is not treated as a small download option appended to quality review.

## D-008 — Export templates must model rigid enterprise import requirements

**Status:** Accepted / implemented in V0.3

Templates can define:

- exact output headers;
- exact order;
- canonical/custom sources;
- fixed values;
- values entered once for each export;
- deliberately blank columns;
- defaults;
- deterministic value mappings;
- output types/date formats;
- required output values.

This came from practical CRM/Marketing Automation workflows where import templates include mandatory placeholders and values common to every row.

## D-009 — Per-export parameters are distinct from constants

**Status:** Accepted / implemented in V0.3

A saved constant is stable across uses of a template.

A per-export parameter is entered once when preparing an export and repeated across all generated rows.

Canonical example: a Marketo `Program Name` changes from event to event even though the Marketo file structure remains reusable.

## D-010 — Blank columns are meaningful data-shape requirements

**Status:** Accepted / implemented in V0.3

Do not automatically remove an output column just because every value is blank. Some destination import contracts require an exact placeholder column and exact position.

## D-011 — Preview and validation precede download

**Status:** Accepted / implemented in V0.3

The user should see the exact generated structure before download. Missing required values and duplicate output headers block export.

Preview must derive from the same deterministic build result as the actual file writer.

## D-012 — Reusable templates are organization/workspace configuration

**Status:** Accepted / implemented in V0.3

Source mapping templates, contact preferences and destination export templates are scoped to an organization and may synchronize across devices through Supabase.

Template metadata may be cloud persisted; imported lead data may not.

## D-013 — Built-in CRM presets are conservative starting points, not universal schemas

**Status:** Accepted / implemented in V0.3

Generic CRM, Salesforce, HubSpot, Marketo and Dynamics presets exist to accelerate setup.

They must remain editable starting points because customer instances often use custom fields, required fields and ordering. Avoid pretending a vendor has one universally correct import schema.

## D-014 — Support CSV / TSV / XLSX / true XLS for the current product

**Status:** Accepted / implemented in V0.3

Core table formats are:

- CSV
- TSV
- XLSX
- XLS

Legacy XLS output must be an actual Excel 97–2003 BIFF8 file, not CSV bytes renamed with an `.xls` extension.

ODS, JSON and XML are not V1 priorities unless evidence changes the roadmap.

## D-015 — Respect legacy XLS constraints

**Status:** Accepted / implemented in V0.3

BIFF8 XLS is limited to 65,536 total rows and 256 columns. Oversized legacy exports should be blocked with a recommendation to use XLSX or a delimited format.

## D-016 — Hosted identity uses a replaceable control-plane boundary

**Status:** Accepted / implemented with Supabase

Current production identity is passwordless work-email OTP through Supabase.

Google/Microsoft integration points exist but production feature flags remain disabled until their full flows are configured and tested.

Enterprise SSO is not required for V1.

## D-017 — Workspace authorization is enforced server-side

**Status:** Accepted / binding

React role visibility is not a security boundary. Membership rules, invitation operations, role changes and ownership transfer must be enforced by RLS/private database functions/RPCs.

Current role model:

- owner
- admin
- member

## D-018 — V1 is reliability-first, not feature-expansion-first

**Status:** Approved roadmap

The accepted sequence from V0.3 is:

```text
V0.4 hardening
→ V0.5 self-service UX
→ V0.6 Recipes
→ V0.7 observability
→ V0.8 validation
→ V0.9 RC
→ V1.0
```

Key gates include a representative real-file corpus, browser E2E coverage, no P0/P1 defects, multi-user usability validation, reusable Recipe validation and measurable product KPI evidence.

## D-019 — Defer major platform expansion until after V1

**Status:** Approved scope constraint

Unless explicitly reprioritized, defer:

- visible multi-source merge UI;
- direct CRM API connectors/push;
- enterprise OIDC/SAML SSO;
- AI-dependent quality decisions.

Architecture may contain ports/foundations for these capabilities, but that is not authorization to make them the next release.

## How to add a new decision

Add a new numbered entry when a choice changes one of these areas:

- user promise/workflow;
- data/privacy boundary;
- layer/dependency direction;
- tenant/security model;
- canonical data semantics;
- export contract semantics;
- V1 scope.

If the decision is architectural and requires trade-off reasoning, add a focused ADR in `docs/adr/` and reference it here.