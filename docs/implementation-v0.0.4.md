# V0.0.4 — React upload and mapping wizard

## Goal

Provide the first usable browser workflow around DemandLint's existing ingestion, mapping and Clean Core layers.

## User flow

```text
Choose / drop CSV or XLSX
  -> parse locally
  -> show source metadata
  -> propose deterministic mappings
  -> user confirms / changes / ignores mappings
  -> validate mapping
  -> run Clean Core analysis
  -> show lightweight result summary
```

Detailed issue review and exports remain V0.0.5.

## Architecture

The UI does not reimplement parsing, mapping or data quality logic.

```text
React UI
  -> browser file adapter
  -> CSV/XLSX adapters
  -> deterministic mapping engine
  -> application mapping validation
  -> Clean Core
```

Lead data remains in the browser. V0.0.4 introduces no backend, database, CRM connection or AI service.

## Mapping validity

Analysis is enabled only when:

1. `First Name`, `Last Name`, `Email` and `Company` are mapped.
2. A canonical target field is not selected by more than one source column.

Columns can be explicitly ignored.

Only unique High-confidence suggestions are pre-selected. Medium, Low, ambiguous and unmatched columns remain ignored until the user chooses a mapping.

## UI behavior

### Upload

- drag and drop
- file picker
- `.csv` and `.xlsx` only
- parser errors displayed as user-facing messages

### Source summary

- file name
- row count
- column count
- source format
- sheet name or CSV delimiter

### Mapping

Each source column displays:

- original header
- sample source value
- suggestion
- confidence
- mapping decision state
- editable canonical-field selector

### Analysis

The V0.0.4 result surface deliberately shows only aggregate counts:

- rows checked
- ready
- review
- blocked
- duplicates

The detailed issue list and downloadable clean/review files belong to V0.0.5.

## Responsive behavior

The mapping table collapses progressively for tablet and mobile layouts. Source headers, suggestion state and the mapping selector remain visible on small screens.

## Language coverage

Column recognition supports curated aliases in:

- English
- French
- Spanish
- Portuguese, including selected Portugal/Brazil variants

This does not yet mean the application UI is localized.

## Privacy statement

V0.0.4 reads the browser `File` into an `ArrayBuffer` and parses it locally. No file or lead row is sent to a backend.
