# @openthrottle/nestjs-postgres

Postgres building blocks for TypeORM repositories in NestJS:

- **`BaseModel`** — an abstract entity base class with a `uuidv7()` `id` primary key and
  `created_at` / `updated_at` / `deleted_at` timestamps.
- **`BaseUuidModel`** — its sibling for tables keyed on `uuid` (the table owns the default, e.g.
  `gen_random_uuid()`) that soft delete with a nullable `is_deleted` flag.
- **`BaseRepository`** — an abstract repository with typed CRUD, bounded pagination, chunked bulk
  inserts, bulk updates and soft delete.
- **`@PostgresProfiling()`** — an opt-in method decorator that EXPLAINs the SQL a repository method
  issues. Every public `BaseRepository` method already carries it.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-postgres
```

**npm:**

```bash
npm install @openthrottle/nestjs-postgres
```

## Model conventions

A model opts into one of two conventions by the base class it extends. `BaseRepository` reads the
convention from the entity class (its static `modelConvention`), so the repository subclass
declares nothing for it.

| Base            | Key                               | Soft delete                                   | Live rows                | Default page order   | Used by                        |
| --------------- | --------------------------------- | --------------------------------------------- | ------------------------ | -------------------- | ------------------------------ |
| `BaseModel`     | `id uuid DEFAULT uuidv7()`        | `deleted_at timestamptz`                      | `deleted_at IS NULL`     | `id`                 | `openthrottle`, when it adopts |
| `BaseUuidModel` | `uuid uuid` (table-owned default) | `is_deleted boolean DEFAULT false` (nullable) | `is_deleted IS NOT TRUE` | `created_at`, `uuid` | `cms`                          |

- **The flag filter is `IS NOT TRUE`**, not `= false`: the column is nullable, and `NULL` reads as
  live.
- **Reads hide deleted rows either way.** TypeORM already filters `@DeleteDateColumn` rows out of
  `find*`; for a flag model `BaseRepository` adds the condition itself to `findById`, `findOne`,
  `findBy`, `findByPaginated`, `update` and the reload in `updateManyReturning`, on every branch of
  an array `where`. `withDeleted: true` skips it, as TypeORM does for timestamps.
- **A flag soft delete is an `UPDATE … SET is_deleted = true`**; TypeORM stamps `updated_at`
  (`@UpdateDateColumn`) on it. A timestamp soft delete stays TypeORM's `softDelete()`.
- `*ById` methods take the primary key, whichever column that is.

## BaseModel and BaseRepository

Extend `BaseModel` (or `BaseUuidModel`) for the entity and `BaseRepository` for its repository. The subclass declares
`tableName` (used in error messages) and, when the create input is not the entity's own shape,
overrides `toEntityInput`.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseModel, BaseRepository } from '@openthrottle/nestjs-postgres';
import { Column, Entity, Repository } from 'typeorm';

@Entity({ name: 'widgets' })
export class Widget extends BaseModel {
  @Column({ comment: 'Display name', type: 'text' })
  name!: string;
}

@Injectable()
export class WidgetRepository extends BaseRepository<
  Widget,
  CreateModelInput<Widget>
> {
  protected readonly tableName = 'widgets';

  constructor(@InjectRepository(Widget) repository: Repository<Widget>) {
    super(repository);
  }
}
```

What you get:

| Method                              | Behavior                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `create(input)`                     | Inserts one row and returns the saved entity.                                                                  |
| `createMany(inputs)`                | One transaction, ordered chunks under Postgres' 65,535 bind parameters and 1,000 rows. Empty input is a no-op. |
| `findById(id, options?)`            | One live row, or `NotFoundException`.                                                                          |
| `findOne(options)`                  | TypeORM `findOne` passthrough; `null` when nothing matches.                                                    |
| `findBy(options?)`                  | **Unbounded** `find`. Server-side jobs only.                                                                   |
| `findByPaginated(options?)`         | One page: `take` clamped to 1–100 (default 25), in the convention's default order unless `order` is given.     |
| `remove(id)`                        | Soft deletes one live row in one statement and returns it, or `NotFoundException`.                             |
| `removeMany(where)`                 | Soft deletes every live match; already-deleted rows are left untouched.                                        |
| `update(id, input)`                 | Loads, assigns and saves one live row, or `NotFoundException`.                                                 |
| `updateMany(where, input)`          | One `UPDATE` over every live match; returns only the count.                                                    |
| `updateManyReturning(where, input)` | Updates up to 1,000 live matches and returns them reloaded; more is a `BadRequestException`.                   |

Choosing between the read and bulk-write pairs:

- **`findBy` vs `findByPaginated`** — anything user-facing goes through `findByPaginated`. `findBy`
  has no limit, so keep it to jobs that genuinely need every row. It takes full `FindManyOptions`,
  unlike TypeORM's `findBy(where)`.
- **`updateMany` vs `updateManyReturning`** — `updateMany` is a single statement and suits large
  sets. `updateManyReturning` runs three statements (select ids, update, reload) so it can return
  the rows; it is not atomic, and it refuses more than 1,000 matches.

The bulk methods (`removeMany`, `updateMany`, `updateManyReturning`) refuse an empty `where`.

**Soft delete needs a column.** `BaseModel` maps `deletedAt` to `deleted_at timestamptz` and
`BaseUuidModel` maps `isDeleted` to `is_deleted boolean`, so a table must have its base's column
before its repository can use the delete methods or the live-row filtering. Add it in a migration
under `databases/<db>/migrations/` (see the `ot-postgres` skill).

## Postgres profiling

Profiling is off unless `POSTGRES_PROFILING=true`. When on, a targeted call captures every SQL
statement the method issues and, **after the method settles**, runs `EXPLAIN` on each in the
background on `repository.manager`. It never changes the method's result or error, and a failing
explain only logs a warning. Because it runs afterwards on its own connection, it does not see the
caller's open transaction.

| Variable                             | Default                     | Meaning                                                                                                     |
| ------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `POSTGRES_PROFILING`                 | `false`                     | Master switch.                                                                                              |
| `POSTGRES_PROFILING_TARGETS`         | _(empty = all)_             | Comma-separated `Class.method` patterns, `*` as a wildcard on either side; `Class` is the runtime class.    |
| `POSTGRES_PROFILING_ANALYZE`         | `false`                     | `true` uses `EXPLAIN (ANALYZE, BUFFERS, …)` for plain SELECTs. A method opts out with `{ analyze: false }`. |
| `POSTGRES_PROFILING_DEDUPE_SECONDS`  | `300`                       | Explain each `Class.method` + SQL at most once per window; `0` explains every execution.                    |
| `POSTGRES_PROFILING_MIN_DURATION_MS` | `0`                         | Skip calls faster than this. It measures the whole method, not one query.                                   |
| `POSTGRES_PROFILING_MODE`            | `logger`                    | `logger` logs a one-line summary per plan (a Seq Scan logs as a warning); `file` writes one JSON per plan.  |
| `POSTGRES_PROFILING_OUTPUT_DIR`      | `<cwd>/.postgres-profiling` | Where `file` mode writes. The default folder is gitignored.                                                 |

Without ANALYZE the plan is the planner's estimate only. **ANALYZE re-executes the SELECT**, so the
real query runs twice; writes, locking reads and `SELECT … INTO` are never analyzed.

**Capture needs the query logger.** Statements are captured through a TypeORM `Logger` wrapper, so
the DataSource must use it. Pass what the `logger` option would otherwise have been, plus the
`logging` option:

```ts
import { createPostgresProfilingQueryLogger } from '@openthrottle/nestjs-postgres';
import type { LoggerOptions } from 'typeorm';

const logging: LoggerOptions = ['error', 'warn'];

TypeOrmModule.forRoot({
  // …connection options
  logger: createPostgresProfilingQueryLogger('advanced-console', logging),
  logging,
});
```

Add `@PostgresProfiling()` to your own repository methods to profile them too:

```ts
@PostgresProfiling({ analyze: false })
async findStale(): Promise<Widget[]> {
  // …
}
```

Tests can `await flushPostgresProfiling()` to wait for the background explains.

## Development

```bash
pnpm nx run @openthrottle/nestjs-postgres:lint
pnpm nx run @openthrottle/nestjs-postgres:typecheck
pnpm nx run @openthrottle/nestjs-postgres:test
pnpm nx run @openthrottle/nestjs-postgres:build
```
