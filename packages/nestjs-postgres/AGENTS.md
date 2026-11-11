# @openthrottle/nestjs-postgres — agent notes

Postgres building blocks for TypeORM repositories: an abstract `BaseRepository` (CRUD,
pagination, chunked bulk inserts, bulk updates and soft delete), the `BaseModel` entity base
class it expects, and the opt-in `@PostgresProfiling()` decorator that EXPLAINs the SQL a
repository method issues.

**Consumed by:** nothing yet. `@openthrottle/nestjs-repositories` is still the package
`openthrottle-server` wires TypeORM through.

**Adoption step (not done yet):** to profile real queries, set that DataSource's `logger` to
`createPostgresProfilingQueryLogger(<previous logger>, <logging>)`, and give each table moved onto
`BaseRepository` a `deleted_at timestamptz` column by migration first.

## Layout

- [src/index.ts](src/index.ts) — public entry point; every export carries `@public`.
- `src/base-model/`, `src/base-repository/` — the entity base and the abstract repository;
  `src/base-repository/testing/test-record/` is test-only (excluded from the build).
- `src/postgres-profiling/` — the decorator plus one sub-folder per concern (settings, query
  capture, explain planning/dedupe/sink/runner, the TypeORM query-logger wrapper).

## Invariants & gotchas

- Built, not source-first: real `build` target, top-level `exports` → `dist` (family pattern —
  see [../AGENTS.md](../AGENTS.md)).
- No `as` casts: the typed `where`/`order`/update builders in `base-repository.utils.ts` use
  overload signatures. Reuse them rather than casting.
- Profiling is module-global state (settings cache, dedupe map, startup flag, pending explains).
  Tests that turn it on must reset it in `afterEach` and `await flushPostgresProfiling()`.

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout, `@public` tags).
