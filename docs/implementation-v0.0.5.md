# V0.0.5 — Data Health review and CSV export

## Goal

Turn the existing processing result into an actionable QA workflow while preserving DemandLint's local-first and no-silent-data-loss principles.

## Data Health review

After analysis, the UI now shows:

- total rows
- unique contacts
- Ready / Review / Blocked counts
- duplicate count
- normalization count
- a transparent CRM-ready percentage: Ready rows divided by total rows

Each source row keeps its original spreadsheet row number and is shown with all associated quality issues.

## Filters

Rows can be filtered by status:

- All
- Ready
- Review
- Blocked

They can also be filtered by issue type:

- Missing
- Invalid
- Duplicate
- Warning
- Normalization

Automatic normalizations remain visible as informational evidence even when the row remains Ready.

## Export behavior

### clean.csv

Contains Ready rows only and uses the canonical field order:

1. firstName
2. lastName
3. email
4. company
5. jobTitle
6. phone
7. country
8. leadSource
9. campaignMemberStatus

### review.csv

Contains every Review and Blocked row. It preserves the same canonical fields and adds:

- `_quality_status`
- `_quality_issue`
- `_source_row`

Duplicate rows are therefore never silently discarded.

## Browser-only export

CSV serialization is deterministic and implemented without a server dependency. Browser downloads are generated from in-memory text using Blob URLs. A UTF-8 BOM is added at download time for spreadsheet compatibility with accented French, Spanish and Portuguese text.

## Architecture

```text
ProcessedDataset
  -> application/qualityReview
      -> row status + issue evidence
      -> clean export rows
      -> review export rows
  -> adapters/export/serializeCsv
  -> adapters/browser/downloadTextFile
  -> local browser download
```

The Clean Core remains unchanged and has no React, browser or export dependency.
