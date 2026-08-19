# ADR 0002 — Framework-independent Clean Core

## Status

Accepted.

## Context

DemandLint's durable value is its data-quality rules and processing behavior, not its UI framework.

## Decision

Business rules live in framework-independent TypeScript under `src/core/`. The core cannot depend on React, Vite, browser APIs, parser libraries, CRM SDKs or AI providers.

## Consequences

- core rules are easy to unit test;
- UI and adapters can change without rewriting the business logic;
- future CLI, API or worker implementations can reuse the same core;
- strict dependency boundaries require a small amount of additional structure.
