# DemandLint — Product Specification

Current product baseline: **V0.3.0**  
Target: **reliable self-service V1**

## Product promise

**Catch bad marketing data before it reaches your CRM, then generate the exact import file the destination expects.**

DemandLint is a local-first data-quality and import-preparation tool for Demand Generation, Field Marketing, Marketing Operations and RevOps teams.

It is designed for the recurring operational problem of receiving lead files from events, partners, webinars and third-party platforms in inconsistent spreadsheet formats, then spending time manually mapping, cleaning, validating and reshaping them before CRM or Marketing Automation import.

## Job to be done

> When I receive a lead file, I want to turn it into a trustworthy, destination-ready import without manually rebuilding spreadsheets or risking bad data in my CRM.

## Primary users

Primary:

- Field Marketing Manager

Secondary:

- Demand Generation
- Marketing Operations
- RevOps
- Growth Marketing
- Event / partner marketing teams handling recurring lead imports

## Current V0.3 workflow

1. Register or sign in with a one-time code sent to a work email.
2. Select an organization workspace.
3. Upload CSV, TSV, XLSX or XLS.
4. For workbooks, let DemandLint inspect sheets and automatically select the strongest lead table; override manually when necessary.
5. Detect and confirm source-column mapping into the canonical DemandLint lead model.
6. Save or reuse organization-specific source mapping templates.
7. Classify multiple email and phone values and choose preferred contact values using organization preferences.
8. Normalize deterministic formatting issues, including supported phone values to E.164.
9. Validate required fields and contact quality, detect duplicates and classify rows as Ready / Review / Blocked.
10. Select or create a destination export template.
11. Supply values requested once for the current export, such as a Marketo Program Name.
12. Preview and validate the exact destination output.
13. Export CSV, semicolon CSV, TSV, XLSX or true Excel 97–2003 XLS.

## Product model

DemandLint has three distinct responsibilities.

### 1. Intake

Understand arbitrary source files:

- CSV / TSV / XLSX / XLS;
- multiple workbook sheets;
- header rows not necessarily on row 1;
- inconsistent names and multilingual headers;
- user-confirmed source mapping.

### 2. Data quality

Convert source rows into a provider-neutral canonical dataset, then apply deterministic and explainable rules:

- normalization;
- required-field validation;
- email quality;
- personal-email policy;
- typed multiple email/phone values;
- phone normalization;
- duplicate detection;
- Ready / Review / Blocked classification;
- provenance for every issue.

### 3. Delivery

Generate the exact structure expected by the destination without mutating the canonical dataset:

- exact output headers;
- exact order;
- intentionally empty columns;
- canonical/custom-field sources;
- constants;
- values prompted once per export;
- defaults and deterministic fallbacks;
- safe value mappings;
- destination output formatting;
- required output validation;
- exact preview before download.

## Core product invariant

**Source mapping and destination export templates are independent.**

Source mapping answers:

> What does my incoming file mean?

Destination preparation answers:

> What exact file must the target system receive?

A clean canonical dataset should be reusable with several destination formats without adding CRM-specific fields or rules to the core cleaning engine.

## Canonical lead fields

Current standard fields include:

- First Name
- Last Name
- Best Email
- Professional Email
- Secondary Email
- Personal Email
- Company
- Job Title
- Best Phone
- Mobile Phone
- Direct Phone
- Switchboard Phone
- Country
- Lead Source
- Campaign Member Status

`customFields` provides an extension point for non-standard fields without turning the canonical model into a collection of vendor/customer-specific properties.

## Quality states

### Ready

No blocking error and no unresolved warning.

### Review

No blocking error, but at least one warning or ambiguous condition requires attention.

### Blocked

At least one blocking issue, for example a missing required value or invalid required contact field.

Blocked and review rows are not silently discarded.

## Current built-in destination starting points

V0.3 provides editable starting points for:

- Generic CRM contacts
- Salesforce Leads
- HubSpot Contacts
- Marketo People
- Microsoft Dynamics 365 Leads

They are deliberately conservative. They are not universal claims about every customer instance or import schema.

## Product principles

- **Action over analytics:** help the user reach a safe import file quickly.
- **Local-first lead data:** uploaded lead data remains in the browser.
- **Deterministic by default:** do not require AI for rules that can be computed reliably.
- **Explain every issue:** corrections and warnings should be understandable.
- **No silent data loss:** conflicting or invalid rows remain reviewable/exportable where appropriate.
- **Provider-neutral core:** CRM/vendor details belong in templates, adapters or future connectors.
- **Reusable configuration:** recurring operational workflows should become repeatable rather than rebuilt in spreadsheets.
- **Workspace-aware:** reusable mappings, preferences and templates belong to the organization, not only one browser session.

## Privacy / data boundary

The browser-local data plane includes:

- uploaded files;
- parsed rows;
- canonical leads;
- contact values;
- quality issues;
- review datasets;
- output previews;
- generated export contents.

The Supabase control plane stores reusable/account configuration such as:

- profiles;
- organizations;
- memberships and invitations;
- contact preferences;
- source mapping templates;
- destination export templates.

Raw lead data is intentionally absent from the hosted database.

## What V1 means

V1 is **not** defined by adding the maximum number of integrations. It is defined by making the current workflow dependable enough that a marketer can use it repeatedly without developer assistance.

The approved path is:

```text
V0.4 Hardening
→ V0.5 Self-service UX
→ V0.6 Recipes
→ V0.7 Observability
→ V0.8 Validation
→ V0.9 Release Candidate
→ V1.0
```

V1 should demonstrate:

- reliability across a representative corpus of real-shaped lead files;
- browser-level regression coverage of the critical workflow;
- robust error/recovery states;
- secure tenant isolation and hosted configuration behavior;
- a self-service user experience validated with real users;
- repeatable Recipes for recurring workflows;
- privacy-safe product observability sufficient to diagnose failures and measure adoption;
- no unresolved P0/P1 release blockers.

## V1 success evidence

The V1 decision should be supported by evidence rather than feature count. Track at minimum:

- completion rate from import to usable export;
- failures by import/export stage and error category;
- time to destination-ready output on representative workflows;
- manual mapping/template corrections required;
- defects found in DemandLint output during real-file validation;
- user confidence in the generated file;
- willingness to reuse DemandLint for the next import;
- successful reuse of saved Recipes/configuration for recurring workflows.

Do not collect raw lead values merely to obtain product analytics.

## Deliberately outside V1 unless reprioritized

- visible multi-file merge/conflict-resolution workflow;
- direct Salesforce/HubSpot/Dynamics/Marketo API push;
- enterprise OIDC/SAML SSO;
- AI-dependent data-quality decisions;
- broad ODS/XML/JSON workflow support;
- a template marketplace or general-purpose transformation scripting engine.

The codebase may contain ports or foundations for some of these future capabilities. Their existence does not make them V1 scope.

## Current real-world validation objective

The original MVP success test remains valid and should now be repeated against V0.3/V1 candidates:

Give the same messy lead workflow to a marketer using their current spreadsheet process and DemandLint. Compare:

- time to destination-ready file;
- manual corrections;
- errors missed;
- confidence in the output;
- repeatability of the process;
- willingness to use DemandLint for the next import.

The open GitHub user-test checklist (`#12`) should be evolved into the V1 validation evidence rather than treated as historical documentation only.