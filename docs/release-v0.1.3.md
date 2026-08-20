# DemandLint V0.1.3 — Contact Data Intelligence

## Product outcome

DemandLint no longer forces several email or phone columns into a single value. It retains every
distinct contact coordinate, identifies its role and deterministically selects the best valid
value for the CRM-ready export.

## Contact roles

Emails:

1. professional;
2. secondary;
3. personal;
4. other / unspecified.

Phones:

1. mobile;
2. direct line;
3. switchboard;
4. other / unspecified.

These are the defaults. The user can reorder both lists, choose a default phone country and select
primary-only or complete contact exports. The current browser adapter saves those preferences on
the device; the application port is ready for authenticated user or organization persistence.

## Phone normalization

- international values beginning with `+` or `00` are normalized to `+` followed by digits;
- supported national values use the row country first, then the configured default country;
- French Excel numeric values that lost their leading zero are handled deterministically;
- extensions are retained separately and excluded from the E.164 value;
- unsupported or ambiguous national values are kept for review rather than guessed;
- E.164 output is limited to 15 digits and is compatible with Salesforce imports.

## Backward compatibility

- `lead.email` remains the selected primary email;
- `lead.phone` remains the selected primary phone;
- existing single-email and single-phone files continue to work;
- typed values are additionally available as `emailProfessional`, `emailSecondary`,
  `emailPersonal`, `phoneMobile`, `phoneDirect` and `phoneStandard`;
- `clean.csv` can include either only primary contact fields or every typed contact field;
- `review.csv` keeps all typed fields and quality evidence.

## Real workbook validation

`TDB_UIPATH.xlsx` is automatically opened on `Leads online`. Its 160 lead rows all receive an E.164
primary phone using the default priority:

- 60 mobile numbers;
- 32 direct-line fallbacks;
- 68 switchboard fallbacks.

## Verification

- TypeScript strict typecheck;
- 68 automated tests across 15 suites;
- production Vite build;
- one additional integration run against the real multi-sheet workbook.
