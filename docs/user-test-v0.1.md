# DemandLint V0.1 — User test protocol

## Objective

Validate whether DemandLint materially improves the real workflow used to prepare lead files for CRM import.

## Test setup

Use the same messy CSV/XLSX lead file twice:

1. clean it using the current Excel / Google Sheets workflow;
2. clean it using DemandLint V0.1.

Do not optimize the manual workflow specifically for the test.

## Measures

Record:

- source file format;
- row count;
- time to CRM-ready file with the current workflow;
- time to CRM-ready file with DemandLint;
- number of manual mapping corrections in DemandLint;
- number of rows classified Ready / Review / Blocked;
- errors caught by DemandLint that manual review missed;
- errors or corrections DemandLint missed;
- confidence in `clean.csv` on a 1–5 scale;
- confidence in `review.csv` on a 1–5 scale.

## Qualitative questions

1. Was every DemandLint warning understandable?
2. Did any automatic normalization feel unsafe?
3. Was reviewing exceptions faster than inspecting the whole source file?
4. Were the exported files immediately usable?
5. What was the most annoying step?
6. What capability was missing?

## Release question

**Would you use DemandLint for your next lead import?**

V0.1 should be considered successful only if the answer is meaningfully positive from real target users.

## Demo data

A deliberately imperfect sample is available at `public/sample-leads.csv` and is deployed as `/sample-leads.csv` on GitHub Pages. It contains normalization cases, a personal email, a missing company, an invalid email and a duplicate.
