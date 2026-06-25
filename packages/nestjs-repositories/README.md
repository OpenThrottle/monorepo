# @openthrottle/nestjs-repositories

NestJS data access layer for Cortex: plans, tasks, embeddings, and related entities.

## Installation

**In this monorepo:** add `"@openthrottle/nestjs-repositories": "workspace:^"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.

## Design notes

### Thin DAL — pagination/ordering invariants live downstream

By design most services here are a thin data-access layer: they expose `getRepository()` and keep query-shaping logic (filtering, ordering, pagination) in their consumers. Some methods (e.g. `findAll` on service accounts) clamp pagination via `resolveListPagination`, but in general **this package does not — and cannot — enforce query-safety or pagination guarantees**. Callers can issue any query against the returned repository. Treat ordering/pagination/limit invariants as the responsibility of the calling layer (resolvers, MCP tools), not this DAL.

### Configuration

- `POSTGRES_URL` / `POSTGRES_*` — Postgres connection (see `getPostgresUrl`).
- `NODE_ENV=development` — enables full TypeORM SQL logging.
- `POSTGRES_SLOW_QUERY_MS` — optional positive integer. When set (in any env), sets TypeORM's `maxQueryExecutionTime`, so queries exceeding the threshold (in milliseconds) emit a `query is slow` warning. Slow-query logging is emitted independently of the `logging` level, so this works even when full SQL logging is off. Leave unset in production unless investigating latency.
