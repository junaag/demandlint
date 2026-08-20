# DemandLint V0.1.2

Multi-sheet XLSX detection and worksheet selection.

## Included

- Local parsing of every worksheet in an XLSX workbook
- Deterministic lead-table ranking based on source-mapping evidence
- Automatic selection of the strongest lead worksheet
- Visible worksheet selector for manual override
- Clean mapping and analysis restart after a worksheet switch
- Header detection below common title or preamble rows
- Multi-sheet adapter and Application-layer regression tests

## Real-file validation

Validated against `TDB_UIPATH.xlsx`:

- 3 worksheets detected: `TdB`, `Leads online`, `Statistiques`
- `Leads online` selected automatically
- 160 lead rows imported
- expected contact headers detected, including company, first name, last name, job title and email

The workbook remains in the browser and is not uploaded to a DemandLint backend.
