# DemandLint — Data Model

DemandLint deliberately has two different data domains:

1. a **browser-local lead data plane** for customer lead data and processing results;
2. a **Supabase control plane** for identity, workspaces and reusable configuration.

This split is an architectural privacy boundary, not an implementation accident.

## Browser-local lead data plane

### RawRow

Incoming row before canonical mapping:

```ts
Record<string, unknown>
```

### ColumnMapping

Maps incoming headers to canonical fields or `ignore`.

```text
source header → CanonicalField | ignore
```

### DatasetSource

Describes an import source:

- `id`
- `name`
- optional `sourceType`
- optional `sheetName`
- optional `headerRowNumber`

### RecordProvenance

Every canonical lead keeps stable source evidence:

- `sourceId`
- `sourceName`
- `rowNumber`
- optional `sourceType`
- optional `sheetName`

This is required for future multi-source conflict evidence and prevents row-number collisions between files.

### CanonicalLead

Current standard fields include:

```text
recordId
provenance
firstName
lastName
email
emailProfessional
emailSecondary
emailPersonal
emails[]
company
jobTitle
phone
phoneMobile
phoneDirect
phoneStandard
phones[]
country
leadSource
campaignMemberStatus
customFields
sourceRow (deprecated compatibility field)
```

`email` and `phone` are the selected best values according to active contact preferences. Typed contact fields/collections preserve alternatives and source evidence.

### EmailContactPoint

- kind: `professional | secondary | personal | other`
- raw value
- normalized value
- validity
- source columns

### PhoneContactPoint

- kind: `mobile | direct | standard | other`
- raw value
- optional E.164 value
- optional extension
- optional country code
- validity: `valid | possible | invalid | ambiguous`
- source columns

### Custom fields

`CanonicalLead.customFields` is the extension mechanism for non-standard/customer fields:

```ts
Record<string, string | number | boolean | null>
```

Do not add dozens of provider/customer-specific properties to `CanonicalLead` when a custom field plus mapping/template behavior is sufficient.

### DataIssue

Quality evidence is attached to stable record identity and provenance.

Key fields:

- `id`
- `recordId`
- `provenance`
- optional canonical `field`
- type: missing / invalid / duplicate / warning / normalization
- severity: error / warning / info
- message
- optional original/proposed values

### ProcessedDataset

```text
leads[]
issues[]
ready[]
review[]
blocked[]
stats
```

Rows are never silently discarded simply because they are blocked or require review.

### ImportSession

The application model can represent multiple import sources, but the current UI exposes a single-source workflow. Treat multi-source support as a partial architectural foundation, not a completed feature.

## Reusable browser/application configuration

### ContactPreferences

Organization-scoped preferences determine:

- email-kind priority;
- phone-kind priority;
- default phone country;
- primary-only vs complete contact export behavior.

### MappingTemplate

Reusable source mapping configuration, organization-scoped. Source mapping is separate from destination export configuration.

### ExportTemplate

Reusable destination file contract, organization-scoped.

See `docs/export-templates.md` for the full model.

## Supabase control plane

The production migration history defines the following primary persisted entities.

### auth.users

Owned by Supabase Auth. DemandLint uses passwordless work-email OTP in the current production flow.

### profiles

```text
id                    → auth.users.id
email                 → normalized unique email
display_name
active_organization_id
created_at
updated_at
```

Deleting the auth user cascades to the profile.

### organizations

```text
id
name
created_by
created_at
```

A new uninvited account receives an initial organization automatically.

### organization_memberships

Composite identity:

```text
organization_id + user_id
```

Role values:

- owner
- admin
- member

The application assumes hierarchical role behavior, but authorization must be enforced in database functions/RLS, not just React.

### organization_invitations

```text
id
organization_id
email
role (admin/member)
invited_by
created_at
accepted_at
```

Pending invitation uniqueness is scoped by organization + email.

### contact_preferences

One preferences document per organization:

```text
organization_id
preferences jsonb
updated_by
updated_at
```

### mapping_templates

```text
id
organization_id
name
source_mapping jsonb
destination_mapping jsonb (legacy/future-facing contract)
source_signature text[]
created_by
created_at
updated_at
```

Important: V0.3's richer destination **export template** is modeled separately. Do not repurpose `mapping_templates.destination_mapping` as a replacement for `export_templates` without an explicit migration/architecture decision.

### export_templates

Added in V0.3.0:

```text
id
organization_id
name
destination_type
config jsonb
created_by
created_at
updated_at
```

A unique organization/name index prevents duplicate normalized template names.

The `config` object contains reusable destination-template metadata. It must not contain source lead rows or generated export contents.

## Relationships

```text
auth.users
    │ 1:1
    ▼
profiles
    │
    │ many-to-many through organization_memberships
    ▼
organizations
    ├── organization_invitations
    ├── contact_preferences
    ├── mapping_templates
    └── export_templates
```

Browser processing is associated with the active organization only for configuration selection. The lead dataset itself is not a Supabase child entity.

## Account creation behavior

The initial hosted-account migration installs a trigger on new Supabase Auth users.

At a high level it:

1. creates the profile;
2. accepts matching pending organization invitations;
3. selects the first resulting organization when invited;
4. otherwise creates a new workspace and owner membership;
5. stores the active organization on the profile.

Later migrations extend member lifecycle, role management, ownership transfer and account deletion permissions.

## RLS / authorization invariant

Every browser-accessible multi-tenant table must be protected by RLS. Membership-aware helper functions live in the private schema.

Never rely on:

- hidden UI controls;
- organization IDs supplied by the browser;
- client-side role checks

as an authorization boundary.

When adding a new organization-scoped table:

1. add the organization foreign key;
2. enable RLS;
3. add explicit policies;
4. revoke anonymous access as appropriate;
5. test cross-organization isolation;
6. document migration/deployment steps.

## What must not be persisted in the current architecture

Unless a new ADR explicitly changes the privacy model, do not add Supabase tables for:

- uploaded lead files;
- raw rows;
- canonical leads;
- contact-point values from imported records;
- quality issues tied to lead rows;
- Ready/Review/Blocked datasets;
- per-export preview rows;
- generated CSV/XLS/XLSX contents.

## Migration discipline

Current production migration sequence:

```text
20260820_000001_hosted_accounts.sql
20260820_000002_member_management.sql
20260820_000003_workspace_role_management.sql
20260820_000004_account_deletion_permissions.sql
20260821_000005_export_templates.sql
```

Treat applied migrations as immutable history. New production changes should normally be additive migrations with a later sequence number.