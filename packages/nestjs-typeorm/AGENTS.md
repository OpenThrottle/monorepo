# @openthrottle/nestjs-typeorm — agent notes

NestJS module bundling a Joi-validated `POSTGRES_*` env config with async TypeORM
`DataSource` providers (`DATA_SOURCE` token).

**Consumed by:** nothing yet — `openthrottle-server` wires its TypeORM root through
`@openthrottle/nestjs-repositories` instead; no workspace project currently depends on
this package.

## Layout

- `src/nestjs-typeorm.config.ts` — the Joi schema (`POSTGRES_*` keys, defaults for
  pool/timeout/SSL knobs) and `getTypeormConfig(configService)`; schema and getter are
  deliberately colocated so they can't drift.
- `src/nestjs-typeorm.module.ts` — composition root: `ConfigModule.forRoot({ isGlobal: true,
validationSchema })` + `DatabaseModule` + `LoggerModule`.
- `src/modules/database/` — `DatabaseModule`, `databaseProviders` (`DataSource().initialize()`
  async provider), constants. The `DATA_SOURCE` provider is registered in exactly one place
  (`DatabaseModule`) and re-exported, so importers share a single DataSource.

## Invariants & gotchas

- Built package (real `build`/`dev` targets, `exports` → `dist/`) — see [../AGENTS.md](../AGENTS.md).
- Importing `NestjsTypeormModule` registers a **global** `ConfigModule` with this Joi schema;
  bootstrap fails unless all required `POSTGRES_*` vars (including `POSTGRES_PATH_MIGRATIONS`
  and `POSTGRES_VERSION`) are set.
- Migrations are owned by the consuming application: the DataSource reads
  `POSTGRES_PATH_MIGRATIONS` at runtime and this package ships no migration CLI.
- Read config through `ConfigService`/`getTypeormConfig`, never `process.env` directly —
  validation-then-`getOrThrow` is the fail-loud contract.

## Pointers

- [README.md](./README.md) — provider/repository-pattern overview.
