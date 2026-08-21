# Adapter instructions

Additional instructions for `src/adapters/`.

For CSV/TSV/XLSX/XLS behavior:

- preserve stable parser error codes and actionable failure states;
- never assume the first workbook sheet is the lead dataset;
- preserve worksheet/header metadata;
- keep automatic sheet selection deterministic and manually overridable;
- never silently merge worksheets;
- true `.xls` output must remain BIFF8, not renamed CSV;
- preserve legacy XLS limits: 65,536 total rows and 256 columns.

For persistence/provider adapters, implement existing application ports before creating parallel abstractions and keep credentials/secrets out of browser-facing code.

Add focused regression coverage under `tests/adapters/`. For real-file defects, add a safe minimized fixture when useful.