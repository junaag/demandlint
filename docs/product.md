# DemandLint — Product Specification

## Problem

Demand Generation, Field Marketing and Marketing Operations teams frequently receive lead files from events, partners, webinars and third-party platforms in inconsistent CSV/XLSX formats. Before those records can be imported into a CRM or marketing automation platform, someone must manually map columns, clean values, detect duplicates, check required fields and isolate problematic rows.

## Job to be done

> When I receive a lead file, I want to quickly validate and prepare it so I can import trustworthy data into my CRM without spending time cleaning spreadsheets manually.

## Primary user

Field Marketing Manager.

Secondary users: Marketing Operations, Demand Generation, Growth Marketing and RevOps.

## V0.1 scope

1. Upload CSV/XLSX.
2. Map source columns to canonical lead fields.
3. Normalize deterministic formatting issues.
4. Validate required fields and email syntax.
5. Detect personal email domains according to a recipe policy.
6. Detect duplicate normalized emails.
7. Separate ready, review and blocked rows.
8. Export clean and review datasets.

## Canonical fields

Initial fields:

- First Name
- Last Name
- Email
- Company
- Job Title
- Phone
- Country
- Lead Source
- Campaign Member Status

## Data states

### Ready
No blocking error and no warning.

### Review
No blocking error, but at least one warning such as a duplicate or personal email domain.

### Blocked
At least one error such as a missing required field or invalid email.

## Product principles

- Action over analytics.
- Explain every issue.
- Never silently discard rows.
- Do not require AI for deterministic problems.
- Do not require CRM connectivity for the MVP.
- Keep uploaded lead data local to the browser in V0.1.

## Out of scope

DemandLint V0.1 is not:

- a CRM;
- a marketing automation platform;
- an event management platform;
- a lead scoring engine;
- an enrichment provider;
- a campaign orchestration tool.

## MVP success test

Give the same messy lead file to a marketer using their current spreadsheet workflow and DemandLint. Compare:

- time to CRM-ready file;
- number of manual corrections;
- errors missed;
- confidence in the output;
- willingness to use DemandLint for the next import.
