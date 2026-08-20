# ADR 0004 — Platform boundaries for SaaS evolution

## Status

Accepted.

## Context

DemandLint V0.1 is a local-first single-user browser application. Planned product evolution includes authentication, organizations, SSO, saved mapping templates, multiple simultaneous source imports and direct CRM destinations.

Adding provider-specific logic directly to React or the Clean Core would couple the product to infrastructure choices and eventually force a rewrite.

## Decision

DemandLint will evolve around four explicit boundaries:

1. **Clean Core** — deterministic data-quality domain logic only.
2. **Application** — import sessions, use cases and provider-neutral ports.
3. **Adapters/Infrastructure** — concrete file, persistence, auth and CRM implementations.
4. **Composition/UI** — runtime wiring and presentation.

React must not import Clean Core or adapter implementation modules directly. Provider names such as Google, Microsoft, Salesforce or HubSpot must not appear in the Clean Core.

Record identity is multi-source safe and based on `recordId` plus provenance, not row number alone.

Source mappings and destination mappings are separate contracts.

## Consequences

- Existing V0.1 processing behavior remains reusable.
- Authentication and persistence can be added without changing normalization/validation logic.
- CRM connectors can be added independently behind one destination connector contract.
- Multi-file imports can share the same pipeline because records carry source provenance.
- A small amount of additional application/composition code is accepted to avoid long-term coupling.
