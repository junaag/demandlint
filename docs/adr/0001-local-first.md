# ADR 0001 — Local-first processing

## Status

Accepted for V0.1.

## Context

DemandLint processes lead files containing personal and business contact data. The first use case does not require server-side persistence or CRM connectivity.

## Decision

V0.1 processes source files in the user's browser and does not persist uploaded lead data on a DemandLint backend.

## Consequences

### Positive

- simpler architecture;
- lower operating cost;
- smaller security surface;
- faster prototype;
- clearer privacy story;
- usable without account creation.

### Negative

- no cross-device persistence;
- no shared team recipes initially;
- browser memory limits apply to very large files.

## Revisit when

A validated feature genuinely requires persistence, team collaboration or server-side processing.
