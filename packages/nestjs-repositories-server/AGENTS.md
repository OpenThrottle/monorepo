# @openthrottle/nestjs-repositories-server — agent notes

The TypeORM data-access layer for the `openthrottle` database (`databases/openthrottle/`), and its
default DataSource config. Every table moved here from the retired `nestjs-repositories` package
(OT plan `052d37b0-f76a-43e1-8a39-4434d0f537d4`); the per-table checklist below is now the recipe
for adding one. One entity on a base model (`BaseModel` or
`BaseHardDeleteModel`), one `BaseRepository` subclass, one module and one fishery factory per
table — the
[`nestjs-repositories-cms`](../nestjs-repositories-cms/AGENTS.md) pattern.

**Consumed by:** `openthrottle-server`, `nestjs-rollout`, `node-client`, `openthrottle-showroom`,
and the root `scripts/` bootstraps.

**GraphQL stays in the server (owner decision).** Unlike `nestjs-repositories-cms`, this package
carries no resolvers, `@ObjectType`/`@InputType` classes or mappers. Only what the repositories
need lives here: entity, repository, module, factory and their tests. The server's
`src/graphql/<area>/` keeps its resolver and injects the repository.

**Wiring: import the table module per GraphQL area.** A server module such as
`src/graphql/notes/notes.module.ts` imports `NotesModule` and injects `NotesRepository`; it does not
pull in `NestjsRepositoriesServerModule`. Each area then declares exactly the tables it touches.
`NestjsRepositoriesServerModule` exists for callers that want every table at once.

## Layout

- `src/index.ts` — barrel of every entity, repository and module; tag exports `@public`.
- `src/modules/<table>/` — one folder per table; the files are the per-table checklist below.
- `src/data-source/` — `getOpenThrottleTypeOrmOptions()` (connection from `POSTGRES_URL` /
  `POSTGRES_*`, `POSTGRES_SLOW_QUERY_MS` for slow-query warnings) and `OPENTHROTTLE_ENTITIES`,
  the explicit entity list it registers. The server adds `autoLoadEntities` on top, for
  entities other packages own (`nestjs-rollout`'s `RolloutFlag`).
- `src/nestjs-repositories-server.module.ts` — `NestjsRepositoriesServerModule`, which imports and
  re-exports every table module.
- `src/testing/` — the fishery factories and repository mocks, published as `./testing` and never
  from the main barrel (they import the `@faker-js/faker` and `vitest` devDependencies, which the
  production image lacks).

## Per-table checklist

Adding a table (or moving one in) is these files and edits, every time (`notes` is the reference):

0. **Pick the base model.** It decides what `remove()` does, so choose by what a deleted row means:

   | The rows are…                                                            | Base                                                       | Delete |
   | ------------------------------------------------------------------------ | ---------------------------------------------------------- | ------ |
   | created and deleted by a user (plans, tasks, notes, repositories, tags)  | `BaseModel`                                                | soft   |
   | append-only, a log or derived (telemetry, token usage, embeddings, runs) | `BaseHardDeleteModel`                                      | hard   |
   | keyed by what they describe, with no uuidv7 `id`                         | none: [natural key](#natural-key-tables-the-one-exception) | hard   |

   Each batch plan names its recommended split. When a table fits two rows, pick `BaseModel`:
   a soft delete can be purged later, but a hard delete cannot be undone.

1. **Migration** (if the table lacks a column its base needs). `BaseModel` needs `id`,
   `created_at`, `updated_at` and `deleted_at`. `BaseHardDeleteModel` needs `id` and `created_at`;
   it gets `updated_at` only if the table updates its rows. Put the migration in
   `databases/openthrottle/migrations/`.
2. `<name>.entity.ts` — `extends` the base from step 0; JSDoc names every migration it matches.
   A `BaseHardDeleteModel` table that updates rows declares its own `@UpdateDateColumn`
   `updatedAt`.
3. `<folder>.repository.ts` — `extends BaseRepository<Entity, CreateModelInput<Entity>>`,
   `tableName`, `@InjectRepository(Entity)`. Custom methods only for data access the consumers
   need beyond `BaseRepository`. **Watch for an old service method named like an inherited one.**
   `BaseRepository.findById` throws `NotFoundException` on a miss, so a service's nullable
   `findById(id): Promise<Entity | null>` must move under a new name (`findRunById` in plan-runs),
   and every caller must be repointed. Typecheck cannot catch a caller left on `findById`, because
   both signatures take a string; only the caller's null branch breaks.
4. `<folder>.module.ts` — `TypeOrmModule.forFeature([Entity])`, provides/exports the repository;
   add it to `NestjsRepositoriesServerModule`.
5. `<folder>.factory.ts` — fishery factory.
6. `<folder>.types.ts` + `<folder>.utils.ts` — `<Folder>RepositoryMock` (an interface extending
   `BaseRepositoryMock` from `@openthrottle/nestjs-postgres/testing` with one `Mock<…>` per
   custom method) and `create<Folder>RepositoryMock()`, which spreads
   `createBaseRepositoryMock(tableName)` and adds them. **A custom repository method and its mock
   land in the same change.**
   `<folder>.utils.ts` is test-only (it imports `vitest`), so a runtime helper the old module kept
   in a utils file moves to a sub-folder of its own, e.g.
   `telemetry-heartbeats/delivery-leg/delivery-leg.utils.ts`. Entity files hold the entity class
   only; their constants and types move to `<folder>.constants.ts` / `<folder>.types.ts`.
7. Tests beside the files: `<folder>.repository.test.ts`, `<folder>.utils.test.ts`.
8. Barrels: entity, repository and module in `src/index.ts`; factory, mock type and mock in
   `src/testing/index.ts`.
9. Add the entity to `OPENTHROTTLE_ENTITIES` in `src/data-source/data-source.constants.ts`.
10. Consumers inject the repository and their tests provide `create<Folder>RepositoryMock()`
    in its place, never a hand-written object of `vi.fn()`s. **A server module that stops
    importing `NestjsRepositoriesServerModule` also loses every table module it re-exports**
    (`RolesModule`, `UsersModule`, `PermissionsModule`, …). Import whatever the module still
    needs, usually `RolesModule` for `GqlPermissionsGuard`. Unit tests cannot see a missing
    provider; only booting `AppModule` does, and step 11's `graphql-schema:write` does that
    (batch 12 lost `RolesRepository` in token-usage and capture-health this way).
11. Run `pnpm run database:test:openthrottle` and `graphql-schema:write` (no `schema.gql` diff).

### Natural-key tables (the one exception)

`code_embeddings` (text `id`, a content hash), `code_index_snapshots` (`workspace_root`),
`user_preferences` and `user_workspace_settings` (`user_id`) are keyed by what they describe, so they
have no uuidv7 `id`. They do **not** extend a base model or `BaseRepository`. Instead:

- The entity keeps its own columns. Add no `id` or `deleted_at` migration just to fit a base.
- `<folder>.repository.ts` is a plain `@Injectable()` class that holds
  `@InjectRepository(Entity) private readonly repository: Repository<Entity>`. It exposes only the
  methods its consumers use, named for the key (`findByUserId`, `upsertForWorkspace`), with
  upserts through `repository.upsert(row, ['<key>'])`. Deletes are hard: these rows are settings
  or caches, and a deleted one is simply recreated.
- `create<Folder>RepositoryMock()` is hand-rolled, and it lives in the package beside the
  repository like every other mock. Type it
  `{ readonly [TMethod in <Folder>RepositoryMethod]: Mock<<Folder>Repository[TMethod]> }`, with
  one `vi.fn()` per method that behaves like an empty table (`null`, `[]`, or a no-op).
- Steps 4, 5 and 7–11 apply unchanged.
- **A natural-key table that only raw SQL touches** (`code_embeddings`, `code_index_snapshots`:
  their reads and writes are SQL in `nestjs-vector-search` and the server's embedding and
  retention processors) moves as entity, `.types.ts` and factory only. It needs no repository,
  module or mock until a consumer wants TypeORM access; add them then, in the same change.

**Why not a key-column override in `ModelConvention` (decided in batch 1, plan `2246e801`):**

- `ModelKeyProperty` is the literal `'id' | 'uuid'`. Widening it to any column would loosen the
  typed key builders, the default order and every `*ById` signature for all tables, to serve four.
- Every base assumes a `created_at`, but `code_index_snapshots` has none and `code_embeddings` has
  no `updated_at`.
- What these tables mostly do is upsert by key, which `BaseRepository` does not offer.
- Any new table gets a uuidv7 `id`, so this list does not grow.

## Invariants & gotchas

- **Entities extend `BaseModel` or `BaseHardDeleteModel`** from `@openthrottle/nestjs-postgres`.
  `BaseModel` is `ID_TIMESTAMP_MODEL_CONVENTION`: `id`, `created_at`, `updated_at`, `deleted_at`.
  `BaseHardDeleteModel` is `ID_HARD_DELETE_MODEL_CONVENTION`: `id`, `created_at`, no soft delete.
  The four natural-key tables are the only exception. A table that lacks a column its base needs
  gets a migration first.
- **Soft delete is `deleted_at IS NULL`.** On a `BaseModel` table, `BaseRepository` reads only live
  rows and `remove()` stamps `deleted_at`. **Raw SQL against a `BaseModel` table must filter
  `deleted_at IS NULL` itself**: `query()`, query builders and search SQL get no implicit filter. A
  hard delete moving onto `BaseModel` becomes a soft delete, so call it out in the PR, along with
  any unique index that now needs `WHERE deleted_at IS NULL`.
- **Transactions keep `manager.getRepository(Entity)`.** Code inside `dataSource.transaction(…)`
  (or anything else handed an `EntityManager`) may keep using the manager's TypeORM repository,
  importing the entity from this package; `BaseRepository` has no transaction support yet. Writes
  there bypass the convention, so a delete inside a transaction on a `BaseModel` table must be
  `manager.softDelete(Entity, …)`, never `manager.delete`. If a batch finds this painful, file
  transaction support in `BaseRepository` as a follow-up plan rather than working around it.
- **A nested `where` on a soft-deleted relation is a no-op.** `findBy({ where: { rule: {
deletedAt: IsNull() } } })` keeps rows whose `rule` is soft deleted: TypeORM LEFT JOINs a
  where-only relation with the soft-delete guard in its ON clause, so a deleted parent joins as
  NULL and matches `IsNull()`. To read rows of live parents only, use a query builder with
  `innerJoin('child.parent', 'parent')` and `andWhere('parent.deletedAt IS NULL')`. Batch 11
  shipped this bug in `RuleApplicationsRepository`; only the live check caught it.
- A schema change is **two edits, together**: the SQL migration under
  `databases/openthrottle/migrations/` AND the entity here. Each entity's class JSDoc names the
  migrations it matches. SQL is the source of truth: `synchronize` is off.
- **Default connection, no name.** `forFeature([Entity])` and `@InjectRepository(Entity)` take no
  connection argument; test tokens are `getRepositoryToken(Entity)`.
- **Every entity is listed explicitly** in `OPENTHROTTLE_ENTITIES`, which
  `getOpenThrottleTypeOrmOptions()` registers. In the server, `autoLoadEntities` would paper over a
  missing one, but scripts that open `new DataSource(getOpenThrottleTypeOrmOptions())` do not load
  it, and there a missing entity fails at query time, not at boot.
- Entity/SQL drift is caught only by the opt-in live test (`pnpm run database:test:openthrottle`,
  see `src/nestjs-repositories-server.module.integration.test.ts`), which compares every column
  this package's entities declare with `information_schema` and round-trips a soft delete on
  `notes`. Run it after adding or touching an entity. It boots on
  `getOpenThrottleTypeOrmOptions()` without `autoLoadEntities`, so a wired table module whose
  entity is missing from `OPENTHROTTLE_ENTITIES` fails there too.
- Built, not source-first: real `build` target, `exports` → `dist`; see [../AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](README.md) — overview and usage.
- [../nestjs-postgres/](../nestjs-postgres/) — `BaseModel`, `BaseRepository`, `CreateModelInput`.
- [../../databases/openthrottle/README.md](../../databases/openthrottle/README.md) — the tables.
