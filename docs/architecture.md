# DemandLint — Architecture V0.1

## Architectural goal

Keep the first product version simple, local-first and deterministic while protecting the business rules from UI/framework churn.

## Dependency rule

```text
UI
 ↓
Application
 ↓
Clean Core
```

The Clean Core must not import React, browser APIs, file parser libraries, CRM SDKs or AI providers.

## Logical layers

### Clean Core

Framework-independent TypeScript containing:

- canonical domain model;
- normalization;
- validation;
- deduplication;
- quality classification;
- processing pipeline.

### Adapters

Future boundary layer for:

- CSV parsing;
- XLSX parsing;
- CSV export;
- browser file APIs.

### Application layer

Coordinates adapters and Clean Core. It should contain workflow orchestration, not business rules.

### UI

React/Vite wizard for Upload → Map → Review → Export.

## Core processing pipeline

```text
Raw rows
  ↓
Column mapping
  ↓
Normalization
  ↓
Validation
  ↓
Duplicate detection
  ↓
Ready / Review / Blocked classification
  ↓
Processed dataset + issues + stats
```

## Determinism

For the same input rows, mapping and recipe configuration, the Clean Core must return the same output. This makes regression testing and user trust easier.

## Data privacy

V0.1 should process source lead data in the browser. The application should not upload the source file to a backend. If AI assistance is introduced later, it must sit behind an explicit adapter and the minimum necessary data should be sent.

## Error philosophy

DemandLint does not silently discard bad data.

- automatic deterministic corrections create informational normalization issues;
- ambiguous conditions create warnings and require review;
- invalid required data creates blocking errors;
- rejected/review rows remain exportable.

## Future extension points

The architecture should allow later adapters for:

- CRM-specific export recipes;
- saved team recipes;
- optional AI-assisted column mapping;
- additional DemandLint modules such as UTM or campaign naming QA.

These are not V0.1 requirements.
