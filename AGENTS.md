# AGENTS.md — DemandLint

DemandLint is a local-first data-quality and CRM import-preparation app.

Treat this file as a map, not the full project manual. Read only the documentation relevant to the task.

## Start with the task, then load context

For a localized change, inspect the target code and nearby tests first. Do not read the entire `docs/` tree or scan the whole repository unless the task genuinely spans multiple subsystems.

Use these sources when needed:

- current implementation status → `docs/current-state.md`
- product behavior / V1 scope → `docs/product.md`, `docs/roadmap.md`
- architecture / boundaries → `docs/architecture.md`, relevant `docs/adr/`
- data model / Supabase entities → `docs/data-model.md`
- destination export semantics → `docs/export-templates.md`
- settled decisions → `docs/decisions.md`
- full takeover/setup → `docs/handover.md`

More specific `AGENTS.md` files exist inside subsystems and apply automatically to files under their directory.

## Repository map

```text
src/core/          deterministic lead-domain rules
src/application/   use cases, workflow contracts, ports
src/adapters/      files, browser APIs, persistence/providers
src/composition/   wiring between application and adapters
src/components/    React UI
supabase/           hosted control plane, migrations, Edge Functions
tests/              unit/integration/architecture fixtures
```

Dependency direction:

```text
UI → Composition → Application → Core
                     ↑
                  Adapters
```

## Commands

CI uses Node 22 and the committed lockfile.

```bash
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run ci
```

`npm run ci` is the required final validation bundle for code changes unless the task is documentation-only.

## Global invariants

1. **Keep deterministic business logic provider-neutral.** CRM/vendor SDKs and infrastructure do not belong in the Clean Core.
2. **Source mapping != destination export template.** Input semantics and output delivery shape are separate models.
3. **Raw lead data stays browser-local.** Supabase stores identity/workspace metadata and reusable configuration, not uploaded/processed lead rows or generated exports.
4. **Never silently lose data.** Preserve provenance and keep ambiguous/invalid rows visible and explainable.
5. **Authorization is server-side.** UI role checks are UX only; database RLS/functions are the security boundary.

If a requested change conflicts with one of these invariants, inspect the relevant architecture/decision docs before editing and call out the conflict.

## Scope discipline

Until V1, prioritize reliability, self-service, repeatability and measurable validation over platform expansion.

Unless the product roadmap is explicitly changed, do not turn these architectural foundations into new scope:

- visible multi-source merge workflow
- direct CRM API push/connectors
- enterprise OIDC/SAML SSO
- AI-dependent deterministic quality decisions

See `docs/roadmap.md` for the current release sequence and gates.

## Testing

Add the smallest useful regression test at the layer that owns the behavior.

- Core rule → `tests/core/`
- Application/use case → `tests/application/`
- Adapter/file/persistence behavior → `tests/adapters/`
- Dependency boundary → `tests/architecture/`

For defects discovered in real files, add a synthetic/anonymized minimized reproducer or programmatic fixture.

Do not replace deterministic unit/application tests with E2E coverage.

## Definition of done

Before declaring code work complete:

1. run `npm run ci`;
2. add/update regression tests where behavior changed;
3. update `docs/current-state.md` only if implementation status changed;
4. update `docs/roadmap.md` only if a roadmap gate/scope changed;
5. add/update an ADR only when an architectural boundary or invariant changed;
6. document any database migration or infrastructure deployment step.

Keep task summaries concise. Do not restate unchanged documentation or perform broad repo exploration when the requested change is already well scoped.

Production frontend deployment is triggered from `main` by `.github/workflows/deploy-pages.yml` and serves `demandlint.com`.