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

Import `NestjsRepositoriesCmsModule` once, then inject a service (for example `LayoutsService`) and
call `getRepository()`. Services are a thin data-access layer: callers own ordering, pagination
and filtering out soft-deleted (`is_deleted`) rows.

### Live schema check

```bash
pnpm run database:migrate -- --database cms
OT_CMS_DB_INTEGRATION=true pnpm nx run nestjs-repositories-cms:test --testFile=src/nestjs-repositories-cms.module.integration.test.ts
```
