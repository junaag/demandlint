# DemandLint — Export Templates

This document captures the V0.3.0 destination-export model and the product decisions behind it.

## Why this exists

CRM and Marketing Automation imports frequently require a precise template rather than a generic clean CSV. The target system may require:

- exact column names;
- exact column order;
- columns that must exist even when empty;
- specific date/boolean/number formats;
- a constant repeated on every row;
- a value that changes once per import but is common to every row;
- target-specific value codes;
- required fields that differ from DemandLint's generic quality rules.

DemandLint therefore separates **data quality** from **delivery shape**.

## Core invariant: source mapping != destination template

### Source mapping

Answers:

> What does this incoming column mean?

Example:

```text
Email Address  → email
Nom            → lastName
Entreprise     → company
```

It normalizes arbitrary input files into DemandLint's canonical dataset.

### Destination export template

Answers:

> What exact file does the destination need?

Example:

```text
1. Email Address
2. First Name
3. Last Name
4. Company Name
5. Country
6. Program Name
7. Lead Source
8. Partner ID (blank)
```

The source file does not need to contain these output headers and does not need to use their order.

Never merge these concepts in future refactors.

## Current V0.3 model

`src/application/exportTemplates.ts` defines `ExportTemplate` and `ExportTemplateColumn`.

A template contains:

- `id`
- optional `organizationId`
- `name`
- `destinationType`
- ordered `columns`
- `defaultFormat`
- optional delimiter
- optional sheet name
- built-in flag for presets

Each output column has:

- stable `id`
- exact `header`
- `source`
- optional `required`
- optional `defaultValue`
- optional output `format`
- optional `datePattern`
- optional `valueMappings`

## Column source kinds

### Canonical field

```text
kind: canonical
field: email
```

Reads a standard DemandLint canonical field.

### Custom field

```text
kind: custom
key: some_source_specific_field
```

Reads `CanonicalLead.customFields` without expanding the standard lead schema.

### Constant

```text
kind: constant
value: Event
```

Writes the same saved value for every output row.

Typical uses:

- Lead Source = Event
- Region = EMEA
- Import Channel = Partner

### Per-export parameter

```text
kind: parameter
key: program_name
label: Marketo program name
```

The template is reusable, but the user supplies one value each time the export is prepared. That value is injected into every row for that export.

Canonical example: **Marketo Program Name**.

This is deliberately different from a saved constant because the program/campaign commonly changes for each event while the export structure stays the same.

### Empty column

```text
kind: empty
```

Creates a deliberately blank column while preserving its header and position. This supports legacy or rigid import templates that require a placeholder column.

## Defaults, fallbacks and mappings

### Default value

If the source value is empty, `defaultValue` supplies a fallback value.

Example:

```text
Country → default France
```

### Canonical contact fallback

The canonical model already exposes selected best contact fields (`email`, `phone`) derived from typed alternatives according to workspace contact preferences. Template authors can also choose typed canonical fields such as `phoneMobile` or `phoneDirect` directly.

Future generalized multi-source fallback chains should be implemented as a generic template capability, not CRM-specific conditionals.

### Value mappings

`valueMappings` performs exact, safe replacements.

Example:

```text
France → FR
Spain  → ES
```

Unmatched values are preserved. Do not turn this feature into opaque heuristic transformation logic.

## Output formats

Current simple output types:

- text
- date
- datetime
- number
- boolean

Current date patterns:

- `yyyy-MM-dd`
- `yyyy/MM/dd`
- `MM/dd/yyyy`
- `dd/MM/yyyy`
- `iso-datetime`

Formatting is applied at export time. The canonical dataset should not be mutated merely because one destination expects a different representation.

## Built-in starting points

V0.3 includes conservative presets for:

- Generic CRM contacts
- Salesforce Leads
- HubSpot Contacts
- Marketo People
- Microsoft Dynamics 365 Leads

These presets are starting points, not claims that every customer instance uses an identical schema. Real organizations may add custom fields, use different required fields or require a different order.

Do not hard-code customer-specific schemas into these built-ins.

## Marketo example

The built-in Marketo preset demonstrates the per-export parameter pattern:

```text
First Name           ← firstName
Last Name            ← lastName
Email Address        ← email (required)
Company Name         ← company
Job Title            ← jobTitle
Phone Number         ← phoneDirect
Mobile Phone Number  ← phoneMobile
Country              ← country
Lead Source          ← leadSource
Program Name         ← prompted once per export (required)
```

If `Program Name` is missing, the export is invalid until the user enters it.

## Validation before download

`buildTemplateExport()` currently validates at least:

- template has at least one column;
- every column has a non-empty header;
- output headers are unique case-insensitively;
- required prompted values are supplied;
- required output fields are non-empty for each source row.

The UI previews the exact first five rows before download. Preview and validation must operate on the same deterministic build result used for the file generation so the user is never shown a representation that differs from the downloaded file.

## Template-from-file workflow

A user can upload a sample target template in:

- CSV
- TSV
- XLSX
- XLS

DemandLint creates a draft export template from the observed headers and, for workbook samples, the worksheet context. The user then configures how each output column is populated.

The uploaded template sample is an input to local configuration generation; it does not authorize upload of lead data to the backend.

## Persistence boundary

Reusable export-template metadata is organization-scoped.

Adapters:

- browser-local repository for local/fallback behavior;
- Supabase repository for hosted cross-device synchronization.

Supabase table:

```text
export_templates
  id
  organization_id
  name
  destination_type
  config (jsonb)
  created_by
  created_at
  updated_at
```

RLS allows authenticated organization members to manage templates for organizations they belong to.

The following remain browser-local and transient:

- lead rows;
- generated preview rows;
- per-export prompted values unless explicitly saved as template defaults;
- generated file contents.

## File generation

Supported V0.3 destinations:

- comma CSV
- semicolon CSV
- TSV
- XLSX
- true Excel 97–2003 BIFF8 XLS

Do not generate a CSV and rename it `.xls`.

Legacy XLS limits:

- maximum 65,536 total rows;
- maximum 256 columns.

DemandLint should block an oversized XLS export and direct the user to XLSX or a delimited format.

## Acceptance criteria for changes to the template engine

A change is not complete unless it preserves these guarantees:

1. Source mapping and destination formatting remain independent.
2. Output column order is deterministic.
3. Blank columns are not dropped.
4. Constants and per-export parameters remain distinct.
5. Required output violations are visible before download.
6. Duplicate headers cannot silently produce ambiguous exports.
7. Preview is generated from the same model as the download.
8. Formatting does not mutate the canonical lead dataset.
9. Organization persistence stores configuration metadata only.
10. Provider-specific behavior is expressed through generic template capabilities wherever possible.
11. Regression tests cover any new source kind, formatter, validator or file writer behavior.

## Future extensions

Potential extensions should be demand-driven and generic, for example:

- richer fallback chains;
- conditional columns;
- more deterministic date/input parsing;
- reusable organization Recipes that bundle quality + export configuration;
- destination schema discovery once direct connectors exist post-V1.

Avoid turning the export template layer into a general-purpose scripting engine before the V1 reliability program is complete.