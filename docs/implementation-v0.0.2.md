# V0.0.2 — CSV/XLSX ingestion adapters

## Goal

Allow DemandLint to ingest real lead files while keeping file parsing outside the Clean Core.

## Boundary

The Clean Core still accepts mapped `RawRow[]` and remains unaware of CSV, XLSX, browser `File` objects, parsing libraries, or UI concerns.

The ingestion layer produces a neutral `ParsedTable`:

- original source column names
- raw rows
- file metadata
- parser warnings

Column detection/mapping is intentionally deferred to V0.0.3.

## Supported inputs

- `.csv` — UTF-8 text, delimiter auto-detected by Papa Parse
- `.xlsx` — first worksheet, parsed locally with `read-excel-file`

Legacy `.xls` is intentionally unsupported in the MVP.

## Local-first flow

```text
Browser File
  -> Uint8Array
  -> parseTableFile()
  -> CSV/XLSX adapter
  -> ParsedTable
  -> future mapping layer
  -> Clean Core
```

No lead data is transmitted to a backend by these adapters.

## Error contract

Parsing failures use `TableParseError` with stable codes:

- `EMPTY_FILE`
- `UNSUPPORTED_FILE_TYPE`
- `INVALID_CSV`
- `INVALID_XLSX`
- `NO_HEADER_ROW`
- `EMPTY_SHEET`

This allows the future UI to display clear user-facing messages without parsing exception strings.

## Design choices

1. Source headers are preserved. Normalization belongs to the mapping layer.
2. CSV values are not dynamically typed; source text stays source text.
3. XLSX uses the first non-empty row as headers and skips fully empty data rows.
4. XLSX primitive values and dates are preserved by the reader.
5. Parsing libraries exist only under `src/adapters/`.
6. The XLSX reader is browser-first and accepts `ArrayBuffer`, which matches the future local-file flow without server upload.

## Out of scope

- automatic header mapping
- multiple-sheet selection
- `.xls`
- CSV encoding detection beyond UTF-8
- server-side uploads
- CRM imports
- AI
