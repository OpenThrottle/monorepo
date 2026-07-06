# @openthrottle/nestjs-repositories — agent notes

The TypeORM data-access layer for OpenThrottle (Cortex): it owns **every** TypeORM entity
(plans, tasks, users, roles, embeddings, subscriptions, …) plus thin per-entity services
and the DataSource config. This is the package `openthrottle-server` actually wires TypeORM
through — the sibling `nestjs-typeorm` has no consumers.

**Consumed by:** `openthrottle-server` and `packages/ai-mcp`.

## Layout

- `src/index.ts` — barrel of every entity, factory, service, and loader; add new exports here.
- `src/modules/<domain>/<name>.entity.ts` — one folder per table; entities + `*.service.ts`
  (thin `getRepository()` wrappers) + `*.factory.ts` (fishery test factories).
- `src/database.config.ts` — DataSource wiring; reads `POSTGRES_URL`/`POSTGRES_*` via
  `getPostgresUrl`, honours `POSTGRES_SLOW_QUERY_MS`.
- `src/common/` — shared `entity-loaders` (dataloader helpers), `list-pagination`,
  `vector.transformer` (pgvector column codec).

## Invariants & gotchas

- A schema change is **two edits, together**: the SQL migration under `databases/migrations/`
  AND the entity here. Every entity's class JSDoc names the migrations it matches, e.g. plan:
  `Matches databases/migrations (002, 012, 014, 022)`. Keep that reference current when you
  add or alter columns.
- Undeclared workspace deps: `src` imports `@openthrottle/nestjs-modules`,
  `@openthrottle/openthrottle-agentic-utils`, and `@openthrottle/openthrottle-agentic-workflow`,
  but `package.json` declares no `@openthrottle/*` dependencies. Add them as
  `workspace:^` dependencies rather than relying on pnpm hoisting (phantom-hoisted-dep bug).
- Thin DAL by design: services return a repository and do **not** enforce
  ordering/pagination/limit safety — that lives in the caller (resolvers, MCP tools). See
  `resolveListPagination` in `common/list-pagination.ts` for the opt-in clamp.
- Built, not source-first: real `build` target, `exports` → `dist`; see
  [../AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](./README.md) — `POSTGRES_*` env vars and slow-query logging.
- [../../databases/AGENTS.md](../../databases/AGENTS.md) — migration authoring.
