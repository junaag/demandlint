# DemandLint

**Catch bad marketing data before it reaches your CRM.**

DemandLint is a local-first data quality tool for Demand Generation, Field Marketing and Marketing Operations teams.

The first module focuses on **lead import quality**:

> Upload a CSV/XLSX lead file → map fields → normalize → validate → deduplicate → review → export CRM-ready data.

## Product principles

- **Local-first**: lead data is processed in the browser for the MVP.
- **Clean Core**: business rules are framework-independent TypeScript.
- **Deterministic by default**: AI is optional and never required for core cleaning/validation.
- **Explainable**: every warning, error and automatic fix is visible.
- **No silent data loss**: rejected or conflicting rows remain exportable for review.
- **Small MVP**: solve import quality first; do not become a CRM or event platform.

## MVP workflow

1. Upload CSV/XLSX
2. Detect and map columns
3. Normalize values
4. Validate required fields and email quality
5. Detect duplicates
6. Review errors/warnings
7. Export clean CSV and review CSV

## Technical direction

- React
- TypeScript
- Vite
- Vitest
- Browser-only processing for V0.1
- GitHub Actions CI
- GitHub Pages deployment later

## Repository status

Completed foundations:

- V0.0.1 — deterministic Clean Core, validation, normalization and deduplication
- V0.0.2 — local CSV/XLSX ingestion adapters
- V0.0.3 — deterministic column mapping engine with EN / FR / ES / PT aliases

Current release:

- V0.0.4 — React upload + mapping wizard connected to the existing core

Next planned step: detailed Data Health review and clean/review CSV export in V0.0.5.

Product and architecture decisions live in `docs/`.
