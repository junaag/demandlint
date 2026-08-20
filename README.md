# DemandLint

**Catch bad marketing data before it reaches your CRM.**

DemandLint is a local-first data quality tool for Demand Generation, Field Marketing and Marketing Operations teams.

The first module focuses on **lead import quality**:

> Upload a CSV/XLSX lead file → map fields → normalize → validate → deduplicate → review → export CRM-ready data.

## Product principles

- **Local-first**: lead data is processed in the browser; the uploaded lead file is not sent to a DemandLint backend.
- **Clean Core**: business rules are framework-independent TypeScript.
- **Deterministic by default**: AI is optional and never required for core cleaning/validation.
- **Explainable**: every warning, error and automatic fix is visible.
- **No silent data loss**: rejected or conflicting rows remain exportable for review.
- **Platform-ready boundaries**: auth, persistence and CRM providers sit outside the Clean Core.

## Current workflow

1. Register or sign in with a one-time code sent to your work email
2. Upload CSV/XLSX (the best lead worksheet is selected automatically in multi-sheet workbooks)
3. Confirm the worksheet when relevant, then detect and map columns
4. Save or apply organization-specific source mapping templates
5. Classify multiple emails and phones by role
6. Select the best valid contact values using organization-specific priorities
7. Normalize phone numbers to Salesforce-compatible E.164 values
8. Validate required fields, contact quality and duplicates
9. Review Ready / Review / Blocked rows
10. Export `clean.csv` and `review.csv`, with primary-only or complete contact fields

Column recognition currently includes common EN / FR / ES / PT lead-export headers.

## Technical direction

- React
- TypeScript
- Vite
- Vitest
- browser-local lead processing
- explicit Application / Core / Adapter / Composition boundaries
- GitHub Actions CI
- reproducible npm lockfile + `npm ci`
- GitHub Pages deployment
- Supabase Auth + Postgres control plane with Row Level Security

## Architecture direction

V0.1.1 prepares DemandLint for future SaaS capabilities without coupling them to the cleaning engine:

- stable record IDs and multi-source provenance;
- import sessions capable of holding multiple source files;
- extensible custom-field contracts;
- separate source and destination mappings;
- provider-neutral auth and organization ports;
- persistent mapping-template repository contract;
- provider-neutral CRM/destination connector contract;
- replaceable validation and deduplication strategies;
- automated architecture-boundary tests.

V0.2.2 replaces the browser-only account preview with Supabase passwordless authentication and a
Row-Level-Security-protected multi-tenant database. Profiles, memberships, preferences and mapping
templates synchronize across devices, while raw lead files and processed lead rows remain local to
the browser.

## Release status

Completed:

- V0.0.1 — deterministic Clean Core, validation, normalization and deduplication
- V0.0.2 — local CSV/XLSX ingestion adapters
- V0.0.3 — deterministic column mapping engine with EN / FR / ES / PT aliases
- V0.0.4 — React upload + mapping wizard
- V0.0.5 — Data Health review + clean/review CSV export
- V0.1.0 — GitHub Pages deployment and real-user test protocol
- V0.1.1 — architecture hardening for saved mappings, multi-source imports, organizations and CRM connectors
- V0.1.2 — automatic lead-sheet detection and manual worksheet selection for multi-sheet XLSX files
- V0.1.3 — typed multi-email/multi-phone handling, configurable priorities, E.164 normalization and complete contact export
- V0.2.0 — local account preview, organization workspaces, role simulation, organization-scoped preferences and saved mappings
- V0.2.1 — work-email-only registration, separate returning-user login, redesigned authentication UI and legal pages
- V0.2.2 — hosted passwordless accounts, secure organization workspaces, invitations and cross-device configuration sync
- V0.2.3 — transactional workspace invitations, member lifecycle controls and hierarchical role/ownership management

A deliberately imperfect sample file is available at `public/sample-leads.csv`.

The V0.1 user test protocol is documented in `docs/user-test-v0.1.md` and tracked in GitHub issue #12.

Product and architecture decisions live in `docs/`.
