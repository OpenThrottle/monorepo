# @openthrottle/nestjs-repositories-cms — agent notes

The TypeORM data-access layer for the `cms` database (`databases/cms/`): one entity per table, thin
per-entity services, fishery factories and the DataSource config. The `cms` sibling of
[`nestjs-repositories`](../nestjs-repositories/AGENTS.md), which owns the `openthrottle` database.

**Consumed by:** nothing yet. Wiring it into an app is OT plan `18a3b88f-50fe-4944-97a3-71835d45e393`.

## Layout

- `src/index.ts` — barrel of every entity, factory, service and module; add new exports here.
- `src/modules/<table>/` — one folder per table: `<name>.entity.ts`, a thin `getRepository()`
  service, its module and a fishery factory.
- `src/nestjs-repositories-cms.utils.ts` — `getCmsTypeOrmOptions()`, the explicit entity list.
- `src/config/` — `CMS_CONNECTION` and the shared `CMS_STATUS` enum values.

## Invariants & gotchas

- A schema change is **two edits, together**: the SQL migration under `databases/cms/migrations/`
  AND the entity here. Each entity's class JSDoc names the migrations it matches. The SQL is the
  source of truth: `synchronize` is off and there are no TypeORM migrations.
- **Named connection, never the default.** Every `forFeature` and `@InjectRepository` passes
  `CMS_CONNECTION`; without it a repository silently binds to the app's default (openthrottle)
  DataSource. Repository tokens in tests are `getRepositoryToken(Entity, CMS_CONNECTION)`.
- The URL comes from `getCmsPostgresUrl` in `@openthrottle/openthrottle-agentic-utils`, which must
  keep the precedence of the `cms` entry in `databases/database-registry.ts`.
- `updated_at` has no trigger; TypeORM's `@UpdateDateColumn` sets it on `save`. Raw SQL writers
  must set it themselves.
- Entity/SQL drift is caught only by the opt-in live test
  (`OT_CMS_DB_INTEGRATION=true`, see `src/nestjs-repositories-cms.module.integration.test.ts`),
  which compares every column's type and nullability with `information_schema`. Run it after
  touching an entity.
- Built, not source-first: real `build` target, `exports` → `dist`; see [../AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](./README.md) — overview and configuration.
- [../../databases/cms/README.md](../../databases/cms/README.md) — the cms tables and their relations.
