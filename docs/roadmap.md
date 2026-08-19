# DemandLint — MVP Roadmap

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
- manual correction UI.

## V0.0.4 — Review experience

- data health summary;
- issue filters;
- row-level review;
- visible automatic fixes.

## V0.0.5 — Export

- CRM-ready CSV;
- review/rejected CSV;
- quality issue column;
- export summary.

## V0.1.0 — First user-testable MVP

A marketer can upload a real CSV/XLSX lead file, map fields, review issues and export a clean dataset entirely in the browser.

## Later, only after validation

- saved recipes;
- CRM-specific export formats;
- optional AI-assisted mapping;
- team workflows;
- other DemandLint QA modules.
