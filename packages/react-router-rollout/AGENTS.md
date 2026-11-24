# @openthrottle/react-router-rollout — agent notes

Client-side React Router SDK for OpenThrottle **rollout** (feature flags): typed
catalog helpers, root provider hydration, and hooks.

**Consumed by:** `openthrottle-developer` (`DeveloperRolloutProvider` + catalog
in `app/global/data/data.rollout-flags.ts`).

## Ownership (do not blur)

| SSOT                                                  | Owns                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| [`@openthrottle/nestjs-rollout`](../nestjs-rollout/)  | Flag entities, `RolloutService` evaluation math, persistence |
| App GraphQL (`openthrottle-server` `graphql/rollout`) | Public `evaluateFeatureFlags`, admin CRUD resolvers          |
| **This package**                                      | Client catalog types, merge/cache/hydration, typed hooks     |

Do not reimplement evaluation / fallthrough here. Do not import app
`__generated__` GraphQL into this package — inject `fetchEvaluations`.

## Layout

- [src/index.ts](src/index.ts) — public entry. Tag new public API with `@public`
  so Knip keeps it.
- [src/catalog/](src/catalog/) — pure typed flag catalog (no React); kinds mirror
  nestjs-rollout / GraphQL `RolloutFlagKind`.
- [src/components/RolloutProvider.tsx](src/components/RolloutProvider.tsx) —
  root provider; inject `fetchEvaluations`.
- [src/hooks/](src/hooks/) — `useRolloutContext`, `useRolloutFlag`,
  `useIsRolloutEnabled`, `useRollout` (pass the catalog object as the first
  argument).
- [src/utils/](src/utils/) — merge, parse `valueJson`, cache read/write,
  defaults-from-catalog.
- [src/config/](src/config/) — default TTL (`DEFAULT_ROLLOUT_CACHE_TTL_MS`),
  sessionStorage key prefix.

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see
  [packages/AGENTS.md](../AGENTS.md).
- **Catalog is client type SSOT; server is runtime evaluation SSOT.** Missing or
  mismatched server flags must fall back to defaults, not crash.
- **Injected fetcher only** — mirror `react-router-notifications` bridge props;
  keep codegen app-side.
- Provider identity prop is **`applicationKey` (string)**. Consumers pass
  `APP_NAME` today; when apps move to a UUID, keep the same prop name (value
  changes only).
- Evaluation must work **anon + auth**. Auth enriches targeting/bucketing; it is
  not a hard gate. Admin CRUD stays on `flags:read` / `flags:write`.
- Pass the catalog **object** to every hook (`useRolloutFlag(flags, 'key')`).
  The context is untyped; the hooks narrow it with
  `isRolloutContextForCatalog`, an identity check (`ctx.catalog === flags`).
  That identity is the only sound evidence of the catalog type, so never add a
  type-argument-only hook — it can only be written with a cast.
- `useIsRolloutEnabled` is boolean-kind keys only (`RolloutBooleanFlagKey`).

## Pointers

- [README.md](README.md) — adopt guide (second app wiring, caching, hooks).
- [../nestjs-rollout/README.md](../nestjs-rollout/README.md) — server domain +
  evaluation model.
- [../AGENTS.md](../AGENTS.md) — parent-tier source-first conventions.
