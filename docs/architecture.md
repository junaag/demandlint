# DemandLint — Architecture V0.1.1

## Architectural goal

Keep DemandLint's data-quality engine local-first, deterministic and framework-independent while allowing the product to grow into an authenticated multi-tenant SaaS with saved mappings, multi-source imports and CRM connectors without rewriting the Clean Core.

## Dependency rule

```text
React UI
   ↓
Application / public contracts
   ↓
Clean Core

Composition root
   ├── Application
   └── Adapters
```

Adapters and future infrastructure implement application-facing contracts. The Clean Core must never import React, browser APIs, file parser libraries, databases, authentication SDKs, CRM SDKs or AI providers.

## Logical layers

### Clean Core

Framework-independent TypeScript containing:

- canonical lead model;
- stable record identity and source provenance;
- normalization;
- validation;
- deduplication;
- quality classification;
- configurable processing strategies;
- deterministic processing pipeline.

The current canonical fields remain the standard DemandLint B2B lead schema. Records also expose `customFields` as an extension point so future CRM-specific fields do not require adding dozens of properties to the standard schema.

V0.1.3 models contact coordinates without breaking the original schema. `email` and `phone`
remain the selected primary values, while typed fields and contact-point collections retain
professional/secondary/personal emails and mobile/direct/switchboard phones with source evidence.

### Application

Owns use cases and product workflow contracts:

- `ImportSession` and multiple import sources;
- source mapping validation;
- review/export shaping;
- account and organization domain contracts;
- source/destination mapping contracts;
- ports for authentication, organizations, saved mapping templates and destination connectors.

Application code may depend on the Clean Core but must not depend on React.

### Adapters

Translate external formats and runtime APIs into DemandLint contracts:

- CSV parsing;
- XLSX parsing;
- browser file access;
- CSV serialization/download;
- future API/database repositories;
- future Salesforce, HubSpot, Dynamics and other connectors.

### Composition

The composition layer is the only place that wires application use cases to concrete browser/infrastructure adapters. React may call composition functions but should not import adapters or Core modules directly.

### UI

React components render state and invoke application/composition operations. UI components must not contain data-quality rules, CRM-specific logic or persistence logic.

Contact preferences use the same boundary: the UI calls the composition layer, which wires a
`ContactPreferenceRepository` port to browser storage. A future authenticated repository can
replace that adapter without changing contact selection or normalization rules.

V0.2.0 scopes those browser preferences by the active organization. Account workspaces and
mapping templates follow the same UI → composition → port → adapter direction. The initial
browser adapters are deliberately replaceable test implementations; they validate product flows
without putting authentication or persistence rules into React or the Clean Core.

## Import session model

V0.1.1 introduces an explicit import session:

```text
ImportSession
  ├── Source A
  │    ├── Parsed table
  │    ├── Mapping plan
  │    ├── Confirmed source mapping
  │    └── Analysis result
  └── Source B
       └── ...
```

The current UI still exposes one source at a time, but the application model can hold multiple sources without changing the Core.

## Record identity and provenance

A row number alone is not a safe identifier once multiple files are present. Every canonical record now carries:

```text
recordId
provenance.sourceId
provenance.sourceName
provenance.rowNumber
provenance.sourceType
provenance.sheetName (when relevant)
```

`sourceRow` remains temporarily for V0.1 compatibility and is deprecated in favor of provenance.

This allows duplicate/conflict evidence such as:

```text
Duplicate between Cvent.csv row 54 and Partner.xlsx row 18
```

without row-number collisions.

## Mapping model

DemandLint distinguishes two concepts.

### Source mapping

Maps incoming columns to the DemandLint schema:

```text
"Correo electrónico" → email
"Empresa"            → company
```

### Destination mapping

Maps DemandLint fields to an external destination schema:

```text
email   → Salesforce.Email
company → Salesforce.Company
```

Saved `MappingTemplate` contracts can contain a source mapping, a destination mapping, or both. This allows one recurring source export to be reused with multiple destinations and vice versa.

## Authentication and organizations

Authentication is outside the Clean Core. The application exposes an `AuthGateway` supporting abstract sign-in methods such as password, Google, Microsoft, OIDC and SAML.

The tenancy model is membership-based:

```text
User ← Membership → Organization
```

A user can therefore belong to multiple organizations. Roles are currently modeled as owner/admin/member. No concrete authentication provider or database is selected in V0.1.1.

## CRM / destination connectors

External systems implement the `DestinationConnector` port. A connector is responsible for:

- connection testing;
- destination schema discovery;
- accepting a destination mapping;
- pushing records;
- returning accepted/rejected counts and per-record errors.

The Clean Core never knows that Salesforce, HubSpot or Dynamics exists.

## Local data plane and future cloud control plane

Target architecture:

```text
Cloud control plane
  users
  organizations
  memberships
  mapping templates
  recipes
  encrypted connector credentials
  audit logs

Browser data plane
  source file parsing
  mapping
  normalization
  validation
  deduplication
  merge/review
```

Lead files can therefore continue to be processed locally even after authentication and persistence are introduced. Server-side processing should only be added when a feature explicitly requires it.

## Processing strategies

`processDataset()` accepts strategy contracts for validation and duplicate detection. The default deterministic behavior is unchanged, but future recipes can substitute stricter validation or different deduplication policies without branching the pipeline.

## Core processing pipeline

```text
Raw rows
  ↓
Source mapping
  ↓
Normalization + provenance
  ↓
Validation strategy
  ↓
Duplicate strategy
  ↓
Ready / Review / Blocked classification
  ↓
Processed dataset + issues + stats
```

Issues are grouped by stable record identity rather than repeatedly scanning all issues by row number.

## Data privacy

Source lead data remains processed in the browser in V0.1.1. Authentication, organization settings and saved templates can later be stored in a backend without requiring raw lead files to be stored there.

Credentials for CRM connectors must never be persisted directly in browser code. Future OAuth refresh tokens and client secrets belong in encrypted server-side infrastructure.

## Error philosophy

DemandLint does not silently discard bad data.

- deterministic corrections create informational normalization issues;
- ambiguous conditions create warnings and require review;
- invalid required data creates blocking errors;
- duplicate/conflict evidence retains source provenance;
- review/blocked rows remain exportable.

## V0.2.0 account preview

The first account workspace is a GitHub Pages-compatible preview:

- a user enters a professional email, but no password is collected or stored;
- the normalized email reopens the same local profile on the same browser;
- organizations, memberships, active organization, contact preferences and mapping templates are
  persisted in browser storage;
- raw lead data remains transient and local to the import session;
- each organization gets isolated preferences and templates;
- owner/admin/member behavior can be evaluated before secure invitations are connected.

The local adapter is not an identity provider and must not be presented as secure authentication.
Production accounts will replace it with hosted implementations of the existing application ports.

V0.2.1 separates the account-creation and returning-user login use cases. Registration only
accepts a professional email and derives preview labels from it; login only reopens a user already
present in the browser repository. This prevents the login screen from silently creating accounts
and maps cleanly to future hosted `signUp` and `signIn` adapter operations.

## V0.2.2 hosted account control plane

Supabase now implements the hosted authentication and persistence boundary. Work-email OTP creates
an authenticated session without a password. Postgres stores profiles, organizations, memberships,
pending invitations, contact preferences and mapping templates. Every exposed table has Row Level
Security, with membership-aware policies and narrowly scoped RPC functions for organization and
account lifecycle operations.

The data-plane split remains unchanged: uploaded lead files, parsed rows, normalized contacts,
deduplication evidence and exports never enter the Supabase schema. Only reusable configuration and
account metadata synchronize across devices. The browser uses the publishable key; administrative
keys remain server-side and are never part of the Vite build.

## Current deliberate limitations

V0.2.2 still does not implement:

- Google/Microsoft login or enterprise SSO;
- invitation revocation and advanced organization administration;
- visible multi-file merge workflow;
- CRM OAuth connections;
- CRM-specific destination adapters;
- streaming/Web Worker processing for very large datasets.

These features should be added behind the contracts introduced here rather than by modifying the Clean Core for each provider.
