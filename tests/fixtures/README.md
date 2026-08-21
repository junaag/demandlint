# DemandLint regression fixtures

This directory contains synthetic or safely anonymized/minimized file-shaped inputs used to reproduce important real-world import/export behaviors.

## Rules

- Never commit a raw customer/event lead file containing real personal data.
- When a real file exposes a defect, minimize it to the smallest structure that reproduces the issue.
- Replace names, emails, phones, companies, IDs and campaign values with synthetic data.
- Preserve only the structural characteristics required for the regression: worksheet order, blank/title rows, header spelling, cell types, delimiter, encoding, formulas or malformed shape.
- Prefer `.example.test` email domains and obviously synthetic organization/person names.
- Add or update an automated test whenever a fixture represents a defect that must never regress.

## Current fixtures

### `golden-event-leads.csv`

Existing deterministic event-lead fixture used by the core/import test suite.

### `multi-sheet-leads.xlsx`

Synthetic workbook reproducing the multi-sheet failure class that led to V0.1.2/V0.3 workbook selection work:

1. `TdB` — dashboard/summary content that must not be selected as the lead table;
2. `Leads online` — the actual lead data on the second worksheet, with two title rows before the real header;
3. `Statistiques` — aggregate statistics that must not be selected as the lead table.

Expected behavior:

- workbook is parsed locally;
- `Leads online` wins automatic selection;
- header row is detected below the title rows;
- all worksheet metadata remains available;
- user can still manually choose another usable worksheet;
- switching sheets resets/recomputes downstream mapping/analysis.

### `messy-multilingual-leads.csv`

Synthetic CSV with mixed FR/ES/EN-style headers, multiple contact columns and intentionally imperfect values. Useful for source-mapping/contact-quality regression work.

### `rigid-marketo-template.csv`

Header-only destination template representing a rigid Marketing Automation import shape with exact order, a prompted Program Name field and a deliberately blank placeholder column.

## V0.4 corpus backlog

Add safe fixtures for:

- malformed/empty CSV;
- delimiter and encoding variants;
- duplicate/empty source headers;
- numeric Excel phone cells and extensions;
- workbook formulas/cached values where behavior matters;
- mixed date cells;
- multiple plausible lead sheets;
- legacy `.xls` real-shaped workbook;
- wide output templates;
- near-limit legacy XLS export;
- ambiguous contacts and duplicates across common event-export shapes.

The goal is not to accumulate large files. The goal is a small, representative corpus that protects the product against known operational failure modes.