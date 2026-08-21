# Core instructions

These instructions apply to `src/core/`.

## Ownership

The Clean Core contains deterministic, framework-independent lead-domain behavior: canonical data, provenance, mapping semantics, normalization, validation, contact selection, deduplication and quality classification.

## Rules

- Do not import React, browser APIs, Supabase, file parser/writer libraries, CRM SDKs or AI providers.
- Prefer deterministic, explainable behavior over heuristics.
- Preserve stable `recordId` and source provenance through processing.
- Never silently drop invalid, duplicate or ambiguous rows.
- Use `customFields` for non-standard/customer fields unless the field is genuinely part of the canonical DemandLint schema.
- Keep `email` and `phone` as selected best values while preserving typed alternatives/evidence.
- Provider-specific destination requirements belong in export templates/adapters, not Core.

## Validation

Behavior changes require focused tests under `tests/core/` and, when contracts cross layers, the relevant application test.

Run `npm run ci` before completion.