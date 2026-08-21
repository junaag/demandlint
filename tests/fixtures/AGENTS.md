# Fixture instructions

These instructions apply to `tests/fixtures/`.

- Never commit raw customer/event files containing real personal data.
- Minimize real defects to the smallest synthetic/anonymized structure that reproduces the behavior.
- Replace names, emails, phones, companies, IDs and campaign values with synthetic values such as `.example` / `.test` domains.
- Preserve only structural characteristics needed for the regression: worksheet order, title/blank rows, headers, cell types, delimiter, encoding, formulas or malformed shape.
- Prefer small fixtures over large realistic datasets.
- Pair a defect fixture with an automated regression test whenever practical.
- Update `tests/fixtures/README.md` when adding a new reusable corpus case.