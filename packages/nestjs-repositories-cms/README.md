# @openthrottle/nestjs-repositories-cms

NestJS TypeORM data access for the OpenThrottle `cms` Postgres database: schemas, fragments, layouts, component libraries, profiles, surveys and tags.

It is the `cms` counterpart of [`@openthrottle/nestjs-repositories`](../nestjs-repositories/README.md), and registers its DataSource under a **named** connection so both can live in one NestJS app.

## Installation

**In this monorepo:** add `"@openthrottle/nestjs-repositories-cms": "workspace:^"` to the consuming package’s `package.json`, then run `pnpm install` from the repository root.

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.

## Design notes

### SQL is the source of truth

The tables are created by the SQL migrations in [`databases/cms/migrations`](../../databases/cms/migrations). TypeORM here is runtime-only: `synchronize: false`, no TypeORM migrations.

### Configuration

- `CMS_POSTGRES_URL` — full connection URL for the cms database. Overrides everything below.
- Otherwise the primary connection (`OPENTHROTTLE_POSTGRES_URL`, `POSTGRES_URL` or `POSTGRES_*`) with
  its database swapped for `CMS_POSTGRES_DB` (default `cms`).
- `POSTGRES_SLOW_QUERY_MS` — optional positive integer; logs queries slower than it, as in
  `@openthrottle/nestjs-repositories`.

### Usage

Import `NestjsRepositoriesCmsModule` once, then inject a repository (for example
`LayoutsRepository`). Every table keyed on `uuid` with an `is_deleted` flag has a repository that
extends `BaseRepository` from `@openthrottle/nestjs-postgres` (its entity extends `BaseUuidModel`):
bounded pagination, soft delete through `is_deleted`, and reads that skip soft-deleted rows
(`is_deleted IS NOT TRUE`, so `NULL` is live). The two join tables, `fragments_children` and
`layouts_libraries`, have no `is_deleted` (and `fragments_children` has a composite key), so they
keep a thin service whose `getRepository()` returns the raw TypeORM repository.

Set `POSTGRES_PROFILING=true` to EXPLAIN what the repositories run; the cms DataSource already logs
through `createPostgresProfilingQueryLogger`.

### Live schema check

```bash
pnpm run database:migrate -- --database cms
pnpm run database:test:cms
```

`database:test:cms` is `POSTGRES_HOST=localhost OT_CMS_DB_INTEGRATION=true pnpm nx run nestjs-repositories-cms:test --skip-nx-cache -- src/nestjs-repositories-cms.module.integration.test.ts` (uncached: Nx hashes neither the opt-in flag nor the database).
Nx loads the root `.env` into the task, and its `POSTGRES_HOST` is `host.docker.internal` (for tools
inside Docker), which does not resolve on the host — so a hand-typed run needs the `POSTGRES_HOST`
override, or `CMS_POSTGRES_URL` pointing at the database.
