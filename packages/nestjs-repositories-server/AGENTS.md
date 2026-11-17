# @openthrottle/nestjs-repositories-server — agent notes

The TypeORM data-access layer for the `openthrottle` database (`databases/openthrottle/`), being
moved here table by table from [`nestjs-repositories`](../nestjs-repositories/AGENTS.md) (OT plan
`052d37b0-f76a-43e1-8a39-4434d0f537d4`). One `BaseModel` entity, one `BaseRepository` subclass,
one module and one fishery factory per table — the
[`nestjs-repositories-cms`](../nestjs-repositories-cms/AGENTS.md) pattern.

**Consumed by:** `openthrottle-server`.

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
- `src/modules/<table>/` — `<name>.entity.ts`, `<folder>.repository.ts`, `<folder>.module.ts`,
  `<folder>.factory.ts`, `<folder>.repository.test.ts`.
- `src/nestjs-repositories-server.module.ts` — `NestjsRepositoriesServerModule`, which imports and
  re-exports every table module.
- `src/testing/` — the fishery factories, published as `./testing` and never from the main barrel
  (they import the `@faker-js/faker` devDependency, which the production image lacks).

## Invariants & gotchas

- **Entities extend `BaseModel`** from `@openthrottle/nestjs-postgres` (`ID_TIMESTAMP_MODEL_CONVENTION`:
  `id`, `created_at`, `updated_at`, `deleted_at`). A table that lacks one of those columns gets a
  migration first.
- **Soft delete is `deleted_at IS NULL`.** `BaseRepository` reads only live rows and `remove()`
  stamps `deleted_at`; raw SQL must filter `deleted_at IS NULL` too. A hard delete moving here
  becomes a soft delete — call it out in the PR.
- A schema change is **two edits, together**: the SQL migration under
  `databases/openthrottle/migrations/` AND the entity here. Each entity's class JSDoc names the
  migrations it matches. SQL is the source of truth: `synchronize` is off.
- **Default connection, no name.** `forFeature([Entity])` and `@InjectRepository(Entity)` take no
  connection argument; test tokens are `getRepositoryToken(Entity)`.
- **The DataSource still lives in `nestjs-repositories`** until the last batch:
  `getTypeOrmOptions()` there lists every entity explicitly and imports moved ones from this
  package. A moved entity missing from that list fails at query time, not at boot.
- Entity/SQL drift is caught only by the opt-in live test (`pnpm run database:test:openthrottle`,
  see `src/nestjs-repositories-server.module.integration.test.ts`), which compares every column
  this package's entities declare with `information_schema` and round-trips a soft delete on
  `notes`. Run it after moving or touching an entity. It registers its own default DataSource with
  `autoLoadEntities`, because the app's DataSource lives in `nestjs-repositories`, which depends
  on this package.
- Built, not source-first: real `build` target, `exports` → `dist`; see [../AGENTS.md](../AGENTS.md).

## Pointers

- [README.md](README.md) — overview and usage.
- [../nestjs-postgres/](../nestjs-postgres/) — `BaseModel`, `BaseRepository`, `CreateModelInput`.
- [../../databases/openthrottle/README.md](../../databases/openthrottle/README.md) — the tables.
