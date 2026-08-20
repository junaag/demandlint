# DemandLint — Product & Platform Roadmap

## V0.0.1 — Clean Core

Goal: prove deterministic processing before building UI.

- canonical lead model;
- normalization;
- required-field validation;
- email validation;
- personal email policy;
- duplicate detection by normalized email;
- ready/review/blocked classification;
- unit tests;
- CI.

## V0.0.2 — File ingestion

- CSV adapter;
- XLSX adapter;
- dataset preview;
- file-size and parsing errors.

## V0.0.3 — Column mapping

- canonical field dictionary;
- deterministic aliases;
- confidence levels;
- EN / FR / ES / PT coverage;
- manual correction UI.

## V0.0.4 — Upload & mapping UI

- React/Vite application;
- local upload flow;
- file metadata;
- mapping confirmation.

## V0.0.5 — Data Health & export

- data health summary;
- issue filters;
- row-level review;
- visible automatic fixes;
- CRM-ready CSV;
- review/rejected CSV.

## V0.1.0 — First user-testable MVP

A marketer can upload a real CSV/XLSX lead file, map fields, review issues and export a clean dataset entirely in the browser.

## V0.1.1 — Architecture Hardening

Prepare the MVP for long-term product expansion without changing the user promise.

- stable record identity and multi-source provenance;
- `ImportSession` model;
- extensible custom-field contracts;
- separate source and destination mappings;
- authentication and organization ports;
- mapping-template repository port;
- destination connector port;
- configurable validation/deduplication strategies;
- UI / application / adapter boundary enforcement;
- split frontend responsibilities;
- reproducible `package-lock.json` + `npm ci` builds;
- architecture ADRs and regression tests.

## V0.1.2 — Multi-sheet XLSX

- parse every worksheet locally;
- rank candidate tables from deterministic source-mapping evidence;
- automatically select the strongest lead worksheet;
- expose all workbook sheets and allow a manual override;
- reset mapping and analysis cleanly after a worksheet switch;
- cover multi-sheet ingestion with regression tests.

## Next: validation-driven releases

### Product feedback / UX hardening

Use real event lead files and capture defects before expanding scope. Add browser-level end-to-end tests around the validated workflow once the UX settles.

### Accounts & saved mappings

- authentication;
- Google and Microsoft sign-in;
- organization memberships and roles;
- persistent source/destination mapping templates;
- team-level recipes.

### Multi-source imports

- multiple files in one import session;
- cross-source duplicate detection;
- deterministic merge rules;
- explicit conflict resolution;
- provenance-aware review.

### CRM destinations

- connector credential service;
- destination schema discovery;
- Salesforce / HubSpot / Dynamics adapters based on customer demand;
- direct push with per-record success/failure evidence;
- audit trail.

### Enterprise platform

- OIDC/SAML SSO;
- organization administration;
- audit logs;
- policy controls;
- larger-dataset processing with Web Workers/streaming where required.

Optional AI assistance remains an adapter-level enhancement and must never become the source of truth for deterministic quality decisions.
