# Core instructions

Additional instructions for `src/core/`.

- Do not import React, browser APIs, Supabase, file parser/writer libraries, CRM SDKs or AI providers.
- Prefer deterministic, explainable behavior over heuristics.
- Preserve stable `recordId` and source provenance through processing.
- Use `customFields` for non-standard/customer fields unless a field genuinely belongs in the canonical DemandLint schema.
- Keep `email` and `phone` as selected best values while preserving typed alternatives and evidence.
- Provider-specific destination requirements belong in export templates/adapters, not Core.

Behavior changes require focused tests under `tests/core/` and, when contracts cross layers, the relevant application test.