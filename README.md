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

1. Upload CSV/XLSX (the best lead worksheet is selected automatically in multi-sheet workbooks)
2. Confirm the worksheet when relevant, then detect and map columns
3. Classify multiple emails and phones by role
4. Select the best valid contact values using saved local priorities
5. Normalize phone numbers to Salesforce-compatible E.164 values
6. Validate required fields and contact quality
7. Detect duplicates
8. Review Ready / Review / Blocked rows
9. Export `clean.csv` and `review.csv`, with primary-only or complete contact fields

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

The current public UI remains local-first and single-source. No real authentication, database or CRM credential is introduced by V0.1.1.

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

A deliberately imperfect sample file is available at `public/sample-leads.csv`.

The V0.1 user test protocol is documented in `docs/user-test-v0.1.md` and tracked in GitHub issue #12.

Product and architecture decisions live in `docs/`.
