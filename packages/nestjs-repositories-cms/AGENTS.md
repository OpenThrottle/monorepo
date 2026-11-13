# @openthrottle/nestjs-repositories-cms — agent notes

The TypeORM data-access layer for the `cms` database (`databases/cms/`): one entity per table, a
`BaseRepository` subclass per content table (thin services for the two join tables), fishery
factories and the DataSource config. The `cms` sibling of
[`nestjs-repositories`](../nestjs-repositories/AGENTS.md), which owns the `openthrottle` database.

**Consumed by:** `openthrottle-server`, which imports `NestjsRepositoriesCmsModule` beside `NestjsRepositoriesModule` and reports the connection as `cms` in `serverHealth` / `GET /health` (OT plan `18a3b88f-50fe-4944-97a3-71835d45e393`).

**GraphQL lives here too (owner decision, OT plan `18a3b88f`).** This is a deliberate exception to
"repositories = thin data access": the cms GraphQL API sits next to the data layer, in
`src/graphql/`, so any server that imports `NestjsRepositoriesCmsModule` (today
`openthrottle-server`, later perhaps a dedicated CMS server) serves the same schema. Resolvers return
hand-written `@ObjectType()` classes and `*ListResult` envelopes (`items`, `totalCount`,
`hasNextPage`), and every query is `@Public()`. After changing a resolver or object type, run
`pnpm nx run openthrottle-server:graphql-schema:write` and affected `codegen-graphql`.

## Layout

- `src/index.ts` — barrel of every entity, factory, service and module; add new exports here.
- `src/modules/<table>/` — one folder per table: `<name>.entity.ts`, its module, a fishery
  factory, and either `<folder>.repository.ts` (a `BaseRepository` subclass; the entity extends
  `BaseUuidModel`) or, for the join tables `fragments-children` / `layouts-libraries`, a thin
  `getRepository()` service. A join table does not fit `BaseUuidModel`: `fragments_children` has a
  composite key and neither has `is_deleted` or `updated_at`.
- `src/nestjs-repositories-cms.utils.ts` — `getCmsTypeOrmOptions()`, the explicit entity list.
- `src/config/` — `CMS_CONNECTION` and the shared `CMS_STATUS` enum values.
- `src/graphql/` — `cms-graphql/` (the module, shared utils and error codes), one folder per area
  (`cms-layouts/`, `cms-libraries/`, `cms-schemas/`, `cms-fragments/`, `cms-fragment-children/`,
  `cms-library-components/`: object, input, mapper, service, resolver), `cms-fragment-tree/` (the
  pure tree builder and its depth/node caps) and `cms-schema-validation/` (the one Ajv instance).
- `src/testing/` — the fishery factories, published as `./testing` and never from the main barrel
  (they import the `@faker-js/faker` devDependency, which the production image lacks).

## Invariants & gotchas

- A schema change is **two edits, together**: the SQL migration under `databases/cms/migrations/`
  AND the entity here. Each entity's class JSDoc names the migrations it matches. The SQL is the
  source of truth: `synchronize` is off and there are no TypeORM migrations.
- **Named connection, never the default.** Every `forFeature` and `@InjectRepository` passes
  `CMS_CONNECTION`; without it a repository silently binds to the app's default (openthrottle)
  DataSource. Repository tokens in tests are `getRepositoryToken(Entity, CMS_CONNECTION)`.
- The URL comes from `getCmsPostgresUrl` in `@openthrottle/openthrottle-agentic-utils`, which must
  keep the precedence of the `cms` entry in `databases/database-registry.ts`.
- `updated_at` is set by a `BEFORE UPDATE` trigger (cms migration `011`) as well as by TypeORM's
  `@UpdateDateColumn`, so raw SQL is covered too. The trigger always wins over an explicit value.
  Edge tables have no `updated_at`: an edge edit stamps its parent fragment.
- **The layout tree is a flat, pre-order list, not a recursive GraphQL type.** Each occurrence has a
  `key` (its uuid path), `parentKey` and ordered `childKeys`, so a shared fragment appears once per
  parent and a stored cycle can never make the result loop. `FragmentsRepository.findTreeRows` is
  the one recursive CTE: depth cap `CMS_FRAGMENT_TREE_MAX_DEPTH` (10), path-based cycle guard,
  soft-deleted fragments and their subtrees skipped, and a `CMS_FRAGMENT_TREE_MAX_NODES` cap that
  fails the read (`CMS_TREE_TOO_LARGE`) rather than truncating it.
- JSON columns go out as `…Json` strings (repo convention, no JSON scalar).
- **Every mutation runs `CmsWriteGuard`.** It needs a signed-in principal, then asks the host's
  `CMS_WRITE_AUTHORIZER` provider whether it may write (the package cannot check permissions
  itself: JWT role claims are not a safe source, and the DB-backed permission model belongs to
  the host). openthrottle-server provides it in `src/services/cms-write-authorizer/` and checks
  `cms:write`. **No provider means every write is refused** (fail closed). For a user it also
  resolves their profile by `openthrottle_user_id` and puts it on the request as `cmsProfile`.
  Expected failures are `GraphQLError`s from `createCmsGraphqlError` with `extensions.code`
  `BAD_USER_INPUT` / `CONFLICT` / `NOT_FOUND` — never a Nest `HttpException`, which the server's
  formatter masks. `BaseRepository`'s own `NotFoundException` is one of those, so services look
  the row up first and raise `NOT_FOUND` themselves.
- **Fragment properties are validated only here** (react-router-cms-core ships no validator):
  `CmsSchemaValidationService` is strict Ajv with `x-cms-widget` registered and no coercion.
  A new fragment pins its typename's newest ACTIVE schema and starts from its defaults; every
  later update validates against that pinned `schema_uuid`, never the newest version.
- **Tree edges are their own mutations** (`add` / `remove` / `reorderCmsFragmentChildren`),
  each one transaction that locks the parent row (`FOR UPDATE`) and stamps its `updated_at`.
  `add` refuses a cycle and anything past depth 10; `reorder` needs exactly the current children.
- `createCmsLayout` creates the layout and its root `is_system` fragment (ACTIVE "Layout" schema)
  in one transaction; `deleteCmsLayout` soft deletes both together. Slugs are unique across
  deleted layouts too (the index covers every row). A fragment cannot be deleted while a live
  parent or layout references it.
- **Never filter `is_deleted = false`.** The column is nullable; the repositories use
  `is_deleted IS NOT TRUE`. Raw SQL must do the same.
- The DataSource logger is `createPostgresProfilingQueryLogger('advanced-console', …)`, so
  `POSTGRES_PROFILING=true` EXPLAINs repository methods.
- Entity/SQL drift is caught only by the opt-in live test
  (`OT_CMS_DB_INTEGRATION=true`, see `src/nestjs-repositories-cms.module.integration.test.ts`),
  which compares every column's type and nullability with `information_schema`, and round-trips a
  soft delete on `tags`. Run it after touching an entity.
- Built, not source-first: real `build` target, `exports` → `dist`; see [../AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](./README.md) — overview and configuration.
- [../../databases/cms/README.md](../../databases/cms/README.md) — the cms tables and their relations.
