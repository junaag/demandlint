# ADR 0003 — No mandatory AI in V0.1

## Status

Accepted.

## Context

Most V0.1 problems—whitespace cleanup, email normalization, required-field checks, duplicate detection and deterministic mapping aliases—do not require a language model.

## Decision

DemandLint V0.1 must remain fully functional without AI. AI may later assist ambiguous mapping or semantic normalization through an optional adapter.

## Consequences

- predictable behavior;
- lower cost;
- easier testing;
- no LLM availability dependency;
- easier privacy posture;
- some ambiguous mappings require manual review until AI assistance is introduced.
