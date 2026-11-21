# @openthrottle/nestjs-postgres — agent notes

Postgres building blocks for TypeORM repositories: an abstract `BaseRepository` (CRUD,
pagination, chunked bulk inserts, bulk updates and soft delete), the three entity base classes it
serves (`BaseModel`: `id` + `deleted_at`; `BaseUuidModel`: `uuid` + nullable `is_deleted`;
`BaseHardDeleteModel`: `id` and no soft delete), and the opt-in `@PostgresProfiling()` decorator
that EXPLAINs the SQL a repository method issues.

**Consumed by:** `@openthrottle/nestjs-repositories-cms` (every cms content table, on
`BaseUuidModel`, and its DataSource logger) and `@openthrottle/nestjs-repositories-server` (the
`openthrottle` tables as they move off `@openthrottle/nestjs-repositories-server`, on `BaseModel`).

**Adoption step (done for cms, not yet for openthrottle):** to profile real queries, set that DataSource's `logger` to
`createPostgresProfilingQueryLogger(<previous logger>, <logging>)`. A table moved onto
`BaseRepository` needs its base's soft-delete column first: `deleted_at timestamptz` for
`BaseModel` (what the `openthrottle` database will use when it adopts), `is_deleted boolean` for
`BaseUuidModel` (what the `cms` tables already have). `BaseHardDeleteModel` needs none: it is for
append-only, log and derived rows, where `remove` / `removeMany` delete for real.

## Layout

- [src/index.ts](src/index.ts) — public entry point; every export carries `@public`.
- `src/base-model/`, `src/base-uuid-model/`, `src/base-hard-delete-model/`, `src/base-repository/` —
  the three entity bases and the abstract repository; `src/base-repository/testing/`
  (`test-record/`, `test-uuid-record/`, `test-hard-delete-record/`) is test-only (excluded from the
  build).
- `src/base-repository-mock/` + `src/testing/index.ts` — `createBaseRepositoryMock` and its
  `BaseRepositoryMock` type, published as `./testing` and never from the main barrel (it imports
  the `vitest` devDependency). The mock is an empty table: reads find nothing, bulk writes match
  nothing, the by-id methods reject with `NotFoundException`, and `create` / `createMany` reject
  until stubbed. Repositories packages extend it with their custom methods; see
  [`nestjs-repositories-server`](../nestjs-repositories-server/AGENTS.md). Add a new
  `BaseRepository` method to `BaseRepositoryMethod` and the mock in the same change.
  `createQueryBuilderMock<T>()` is the shared chainable `SelectQueryBuilder` mock (every method a
  typed `vi.fn`, empty terminal defaults); it needs `@golevelup/ts-vitest`, a devDependency like
  `vitest`.
- `src/model-convention/` — the key / soft-delete convention union and the three constants each base
  declares as its static `modelConvention`.
- `src/entity-loaders/`, `src/like-pattern/`, `src/pagination/`, `src/unique-violation/`,
  `src/vector-transformer/` — domain-free TypeORM helpers (DataLoaders over a repository, `LIKE`
  escaping, offset-pagination clamps and the `OffsetPage` shape, the 23505 check, the pgvector transformer), moved here from
  `nestjs-repositories` so moved repositories can share them.
- `src/pagination/` — the one offset-pagination policy: `PAGINATION_DEFAULT_LIMIT` 25,
  `PAGINATION_MAX_LIMIT` 100, `resolvePagination(input, { defaultLimit?, max? })` (always clamps,
  never throws), `paginate(qb, input, options)` for a query builder with its own order or joins,
  `OffsetPage<T>` (`{ items, totalCount }`) and `hasNextPage(page, skip)`.
  `BaseRepository.findByPaginated` goes through the same clamp. Rejecting bad input is the
  GraphQL boundary's job (`assertPagination` in `nestjs-graphql`), not this package's.
- `src/sort-order/` — gapped sort orders unique per scope among live rows (`tasks` in a plan,
  `plans` in a project): append, insert-beside, rebalance, partial-list reorder (in place) and
  two-row move. Each takes an `EntityManager` + a `SortOrderScope` constant, holds a
  per-scope `pg_advisory_xact_lock`, parks rows in a negative band so no step trips the partial
  unique index, and returns a discriminated union instead of throwing. Its real proof is the
  gated `sort-order.utils.integration.test.ts` (run command in its header; CI does not run it).
- `src/postgres-profiling/` — the decorator plus one sub-folder per concern (settings, query
  capture, explain planning/dedupe/sink/runner, the TypeORM query-logger wrapper).

## Invariants & gotchas

- Built, not source-first: real `build` target, top-level `exports` → `dist` (family pattern —
  see [../AGENTS.md](../AGENTS.md)).
- **The convention comes from the entity class, not the repository.** `BaseRepository` resolves it
  in its constructor from `repository.target`'s static `modelConvention` and throws if the target
  extends none of the bases. Every where/order/select builder in `base-repository.utils.ts` takes it;
  never hard-code `id` or `deletedAt` in a method again.
- **Flag live rows are `IS NOT TRUE`** (`is_deleted` is nullable), and flag models get the filter
  added explicitly on reads because TypeORM's implicit soft-delete filter only knows
  `@DeleteDateColumn`. Timestamp models are byte-for-byte what they were before the convention
  existed — `base-repository.repository.test.ts` pins that; `test-uuid-record.repository.test.ts`
  covers the flag branch and `test-hard-delete-record.repository.test.ts` the `none` branch.
- **`softDelete.kind` is a three-way union** (`timestamp` | `flag` | `none`). Branch on it with an
  exhaustive `switch`, so adding a fourth convention is a compile error everywhere it matters.
  `none` reads pass straight through and deletes are real `DELETE`s.
- **`BaseHardDeleteModel` has no `updated_at`.** A table that updates rows declares its own
  `@UpdateDateColumn`; `ModelManagedKeys` drops `updatedAt` from create input either way.
- No `as` casts: the typed `where`/`order`/update builders in `base-repository.utils.ts` use
  overload signatures. Reuse them rather than casting.
- Profiling is module-global state (settings cache, dedupe map, startup flag, pending explains).
  Tests that turn it on must reset it in `afterEach` and `await flushPostgresProfiling()`.

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout, `@public` tags).
