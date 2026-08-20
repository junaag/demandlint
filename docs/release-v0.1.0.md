# DemandLint V0.1.0

First end-to-end user-testable MVP.

## Included

- Local CSV/XLSX ingestion
- Deterministic EN / FR / ES / PT column mapping
- Normalization, validation and duplicate detection
- Data Health review with Ready / Review / Blocked states
- `clean.csv` and `review.csv` browser-local exports
- Responsive React UI
- Explicit local-processing privacy notice
- GitHub Pages deployment workflow

## Deployment

GitHub Pages is configured to publish through GitHub Actions. The deployment workflow runs on pushes to `main` and publishes the Vite `dist/` artifact to the `github-pages` environment.

## Validation

V0.1.0 is considered technically released once the public Pages URL is reachable and the sample file completes the full Upload → Mapping → Review → Export path.

Product validation is tracked separately in issue #12 using a real messy lead file and comparison against the current manual Excel/Google Sheets workflow.
