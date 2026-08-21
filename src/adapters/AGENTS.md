# Adapter instructions

These instructions apply to `src/adapters/`.

## Ownership

Adapters translate external formats/runtime services into DemandLint application contracts. They may depend on parser/browser/provider libraries; the Clean Core may not depend on them.

## File adapters

For CSV/TSV/XLSX/XLS changes:

- preserve stable parser error codes and actionable failure states;
- do not infer that the first workbook sheet is the lead dataset;
- inspect workbook candidates and preserve worksheet/header metadata;
- automatic selection must remain deterministic and manually overridable;
- never silently merge worksheets;
- when worksheet selection changes, downstream mapping/analysis must be recomputed by the workflow;
- true `.xls` output must remain BIFF8, not renamed CSV;
- preserve legacy XLS limits: 65,536 total rows and 256 columns.

## Persistence/provider adapters

- implement existing application ports before inventing parallel abstractions;
- keep raw lead content out of hosted persistence unless an explicit architecture decision changes the boundary;
- keep credentials/secrets out of browser-facing code.

## Validation

Add focused regression coverage under `tests/adapters/` for parser, serialization or repository behavior. For a real-file defect, add a safe minimized fixture when useful.

Run `npm run ci` before completion.