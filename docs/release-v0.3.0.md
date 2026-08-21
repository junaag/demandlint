# DemandLint V0.3.0 — Destination-ready exports

V0.3.0 turns the generic clean-file download into a reusable export preparation workflow.

## Product changes

- A fourth **Prepare export** step appears after data-quality review.
- Source mapping templates and destination export templates are independent.
- Built-in starting points cover Generic CRM, Salesforce Leads, HubSpot Contacts, Marketo People and Dynamics 365 Leads.
- Workspace templates define exact column headers and order, data sources, constants, per-export prompts, empty columns, fallbacks, value mappings and simple output types.
- Users can upload a sample CSV, TSV, XLSX or XLS file to create a draft from its headers and worksheet name.
- The exact first five rows are previewed before download; duplicate headers and missing required values block export.
- Clean data can be exported as comma CSV, semicolon CSV, TSV, XLSX or a true Excel 97–2003 BIFF8 XLS file.
- Legacy XLS input is parsed directly, including multi-sheet workbooks and automatic lead-sheet selection.

## Data boundary

Only reusable export-template metadata is synchronized through the active Supabase organization. Uploaded files, parsed lead rows, preview rows and generated export contents remain in the browser.

## Compatibility notes

Legacy XLS is limited to 65,536 total rows and 256 columns. DemandLint blocks larger XLS exports and directs users to XLSX or a delimited format instead.
