# @openthrottle/nestjs-postgres — agent notes

Postgres building blocks for TypeORM repositories: an abstract `BaseRepository` (CRUD,
pagination, chunked bulk inserts, bulk updates and soft delete), the two entity base classes it
serves (`BaseModel`: `id` + `deleted_at`; `BaseUuidModel`: `uuid` + nullable `is_deleted`), and the opt-in `@PostgresProfiling()` decorator that EXPLAINs the SQL a
repository method issues.

**Consumed by:** `@openthrottle/nestjs-repositories-cms` (every cms content table, on
`BaseUuidModel`, and its DataSource logger). `@openthrottle/nestjs-repositories` (the `openthrottle`
database) has not adopted it yet.

**Adoption step (done for cms, not yet for openthrottle):** to profile real queries, set that DataSource's `logger` to
`createPostgresProfilingQueryLogger(<previous logger>, <logging>)`. A table moved onto
`BaseRepository` needs its base's soft-delete column first: `deleted_at timestamptz` for
`BaseModel` (what the `openthrottle` database will use when it adopts), `is_deleted boolean` for
`BaseUuidModel` (what the `cms` tables already have).

## Layout

- [src/index.ts](src/index.ts) — public entry point; every export carries `@public`.
- `src/base-model/`, `src/base-uuid-model/`, `src/base-repository/` — the two entity bases and
  the abstract repository; `src/base-repository/testing/` (`test-record/`, `test-uuid-record/`) is
  test-only (excluded from the build).
- `src/model-convention/` — the key / soft-delete convention union and the two constants each base
  declares as its static `modelConvention`.
- `src/postgres-profiling/` — the decorator plus one sub-folder per concern (settings, query
  capture, explain planning/dedupe/sink/runner, the TypeORM query-logger wrapper).

## Invariants & gotchas

- Built, not source-first: real `build` target, top-level `exports` → `dist` (family pattern —
  see [../AGENTS.md](../AGENTS.md)).
- **The convention comes from the entity class, not the repository.** `BaseRepository` resolves it
  in its constructor from `repository.target`'s static `modelConvention` and throws if the target
  extends neither base. Every where/order/select builder in `base-repository.utils.ts` takes it;
  never hard-code `id` or `deletedAt` in a method again.
- **Flag live rows are `IS NOT TRUE`** (`is_deleted` is nullable), and flag models get the filter
  added explicitly on reads because TypeORM's implicit soft-delete filter only knows
  `@DeleteDateColumn`. Timestamp models are byte-for-byte what they were before the convention
  existed — `base-repository.repository.test.ts` pins that; `base-repository.uuid.test.ts` covers
  the flag branch.
- No `as` casts: the typed `where`/`order`/update builders in `base-repository.utils.ts` use
  overload signatures. Reuse them rather than casting.
- Profiling is module-global state (settings cache, dedupe map, startup flag, pending explains).
  Tests that turn it on must reset it in `afterEach` and `await flushPostgresProfiling()`.

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout, `@public` tags).
