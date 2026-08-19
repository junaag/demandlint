# V0.0.3 — Deterministic column mapping

## Goal

Convert arbitrary source headers into explainable suggestions for DemandLint's canonical lead fields without requiring AI.

## Language coverage

The default deterministic dictionary covers common lead-export headers in:

- English (EN)
- French (FR)
- Spanish (ES)
- Portuguese (PT, with common Brazilian variants where useful)

Language coverage applies to source column recognition; it does not imply full UI localization.

## Canonical fields

- First Name
- Last Name
- Email
- Company
- Job Title
- Phone
- Country
- Lead Source
- Campaign Member Status

## Pipeline

```text
ParsedTable.columns
  -> canonicalizeHeader()
  -> synonym/canonical comparison
  -> ranked candidates
  -> ambiguity detection
  -> MappingPlan
  -> future mapping UI
```

## Header canonicalization

Headers are compared after deterministic normalization:

- Unicode accent removal
- lowercase
- punctuation/separators converted to spaces
- repeated whitespace collapsed

The original header is always retained for display and final mapping.

## Confidence model

### High

Exact match against a canonical field label or known synonym.

Examples:

- `First Name` -> `firstName`
- `Prénom` -> `firstName`
- `Nombre` -> `firstName`
- `Primeiro nome` -> `firstName`
- `Organisation` -> `company`
- `Empresa` -> `company`
- `Nome da empresa` -> `company`
- `Business Email` -> `email`
- `Correo electrónico` -> `email`
- `Email profissional` -> `email`

A unique High match can be auto-selected.

### Medium

A known multi-word alias is fully contained in a longer source header.

Example:

- `Registrant Business Email Address` -> suggested `email`

Medium mappings require user review.

### Low

Only a single known keyword is present.

Example:

- `Registrant Company Code` -> suggested `company`

Low mappings require user review.

## Ambiguity rules

DemandLint never guesses when the evidence is tied or structurally conflicting.

### Candidate ambiguity

`Company Email` contains equally weak signals for `company` and `email`. It is marked ambiguous.

### Duplicate target ambiguity

If both `Email` and `Business Email` exist, both are individually High-confidence matches to `email`, but DemandLint cannot know which source field should win. Neither is auto-applied; both require review.

## MappingPlan

The engine returns:

- one suggestion per source column
- ranked candidates with confidence, score and reason
- decision: `auto`, `review`, `ambiguous`, or `unmapped`
- a partial `autoMapping` containing only safe automatic decisions
- summary counts

Unknown fields are left unmapped rather than silently ignored. The future UI may let the user explicitly map or ignore them.

## Why no fuzzy string library?

V0.0.3 deliberately uses deterministic normalization and curated synonyms. This makes behavior:

- predictable
- explainable
- cheap
- local-first
- easy to test

Fuzzy similarity or AI assistance can be evaluated later only for headers that remain unresolved.

## Out of scope

- UI localization
- persisted custom dictionaries
- organization-specific recipes
- value-based field inference
- fuzzy edit-distance matching
- LLM mapping
