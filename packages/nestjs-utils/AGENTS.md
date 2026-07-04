# @openthrottle/nestjs-utils — agent notes

Two small things only: DataLoader factory helpers for GraphQL resolvers
(`createDataLoader`, `createLoaderFromFindByIds`) and the shared HTTP header constants
`HEADER_APP_NAME` / `HEADER_APP_VERSION`. Deliberately **not** a grab-bag — no decorators,
pipes, or filters; think twice before growing it.

**Consumed by:** `openthrottle-server`, `@openthrottle/nestjs-modules`.

## Invariants & gotchas

- Built package (real `build` target, `exports` → `dist/`; the `__dev` key is a placeholder —
  no watch target) — see [../AGENTS.md](../AGENTS.md).
- Loader contract (enforced by the helpers' types, detailed in the README): create loaders
  per GraphQL request to avoid cross-request cache leakage; batch functions must preserve
  input key order/length; `keyFn` is required whenever the entity is not keyed by `id`.

## Pointers

- [README.md](./README.md) — full usage examples for both loader helpers and the header table.
