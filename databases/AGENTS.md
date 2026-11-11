# databases/ — agent notes

Family-shared notes for `databases/`: every Postgres database this repository owns, all served by the one Postgres instance in the root `docker-compose.yml`. Monorepo-wide rules live in the root [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md). Each database's specifics live in its own README and are not repeated here.

| Database       | Folder                             | Reference                                                                                                                                |
| -------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `openthrottle` | [`openthrottle/`](./openthrottle/) | [openthrottle/README.md](./openthrottle/README.md): schema, embedding dimension strategy, commit links, status semantics, migration list |
| `cms`          | [`cms/`](./cms/)                   | [cms/README.md](./cms/README.md): CMS schema, its RocketCMS origin, profile identity                                                     |

## Not an Nx project

No `package.json` here. Everything runs through root `pnpm run database:*` scripts (implemented in root `scripts/`) against the **root** `docker-compose.yml` Postgres/Redis.

## Layout

- [`database-registry.ts`](./database-registry.ts) lists every database: its name, migrations directory, the core tables that gate the ledger cut-over, its retired migrations, and how its connection resolves. Every migration entrypoint, `database:backup`, the shared-DB worktree guard and the static migration checks iterate it. Nothing else may hardcode a migrations path.
- `openthrottle` is the **primary**: it is the database `POSTGRES_*` names. Every other database lives on the same server, and its URL is the primary's with the database swapped (`CMS_POSTGRES_DB`, default `cms`). An explicit URL (`CMS_POSTGRES_URL`) overrides that.
- Each database folder holds `migrations/` and, as it needs them, `seeds/`, `reports/` and `backups/`. The shared runner ([`migration-runner.ts`](./migration-runner.ts)) and the container entrypoint ([`migrate.ts`](./migrate.ts)) stay at this root.

## Migrations

- Numbered `NNN_snake_case.sql` files in `databases/<db>/migrations/`. **Numbering is per database**: `cms` has its own `001`. Each file is applied once, in filename order, through a `schema_migrations` ledger **inside that database**. [`migration-runner.ts`](./migration-runner.ts) is the only ledger implementation. It and the registry import nothing but `pg` and `node:*` and use erasable TypeScript only, because the migrations image runs them with Node's native type stripping.
- Entrypoints for that runner: (1) `pnpm run database:migrate` (`scripts/openthrottle-database-migrations.ts`), manual/standalone, with `-- --database <name>` to migrate one; (2) `monorepo:ensure-migrations`, the dev/start Nx gate (`scripts/ensure-migrations.ts`) wired into `openthrottle-server` `dev`/`dev-api`/`worker`/`start`, which waits for Postgres then applies pending migrations before boot (it fails fast pointing at `pnpm run database:start` if the DB is down); (3) [`migrate.ts`](./migrate.ts), run by `Dockerfile.Migrations` as the compose `migrations` init service, authoritative for container installs. All three migrate every database, primary first.
- **A missing database is created by the runner**, not by an init script: `/docker-entrypoint-initdb.d` only runs on an empty volume, and a deployed box does not use `Dockerfile.Postgres` at all. Creation is idempotent, and losing a race to another runner counts as success.
- **Fail-fast**: the first database that fails stops the run, and the entrypoint exits non-zero. Later databases are not attempted, because a half-migrated stack must not boot.
- An empty ledger on a DB that already has its core tables is a one-time cut-over: every file is applied once and recorded, never marked applied without running.
- The ledger keys on the file's **basename**, so moving a migrations directory re-applies nothing. Moving files is safe; renaming one is not (see [skills/ot-postgres/SKILL.md](../skills/ot-postgres/SKILL.md)).
- SQL files are the **single source of truth** for schema. TypeORM is runtime-only (DataSource pooling, entities for type safety); the TypeORM migration runner is deliberately not used.
- Never edit an applied migration in place — add a new numbered file. Comment backfills go in batch files (≤10 tables per file).
- Every `CREATE TABLE` must have `COMMENT ON TABLE` in the **same** migration file (tone model: `openthrottle/migrations/038_create_plan_runs_table.sql`; say "OpenThrottle", or "OpenThrottle CMS" in `cms`). `COMMENT ON COLUMN` for non-obvious columns. Enforced diff-scoped vs `main`, across every database, by `pnpm nx run monorepo:check-migration-table-comments` (also in `check:local`). A byte-identical rename does not count as a change.
- Use idempotent DDL (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER`s, foreign keys in their own guarded statement). Patterns and naming: [skills/ot-postgres/SKILL.md](../skills/ot-postgres/SKILL.md).
- After an `openthrottle` schema change, sync the TypeORM entities in `@openthrottle/nestjs-repositories` (entity JSDoc cites the migration numbers). After a `cms` schema change, sync the entities in `@openthrottle/nestjs-repositories-cms`.
- A shared-DB worktree refuses a branch-only migration in **any** database; run `pnpm worktree:db isolate` first.

## Adding a database

1. Add an entry to [`database-registry.ts`](./database-registry.ts), with its name env var and URL env var.
2. Create `databases/<name>/migrations/` and a `databases/<name>/README.md`.
3. Add a `COPY` for its migrations to `Dockerfile.Migrations`; `.dockerignore` already admits every `databases/*/migrations`.
4. Add its run to `openthrottle/backup-offsite.sh`, which keeps its own list because it is a shell script, and document the env vars in `docs/monorepo/environment-variables.md` and the root `.env.default`.
5. Nothing else: `database:migrate`, the dev gate, the migrations image, `worktree:db isolate` and `database:backup` pick it up from the registry.

## Other contents

- `<db>/backups/` — zip dumps from `pnpm run database:backup`, one per database (`<db>-YYYYMMDD-HHMMSS.zip`, retention per database). The migrate script itself does **not** back up; run a backup first before risky migrations.
- [`openthrottle/backup-offsite.sh`](./openthrottle/backup-offsite.sh) — host-level nightly `pg_dump` of **every** database, shipped off the box via rclone, with per-database retention mirroring `DATABASE_BACKUP_RETENTION_COUNT`. **The app's own scheduled backup job cannot run on a deployed box** — it spawns `pnpm run database:backup` in a workspace checkout, which a distroless image does not have — so this is the only database backup on a deployment. Wired as a systemd timer by the Hetzner cloud-init.
- [`openthrottle/SEEDING.md`](./openthrottle/SEEDING.md) + [`openthrottle/verify-restore.sh`](./openthrottle/verify-restore.sh) — provider-agnostic runbook for loading a dump into a fresh database (Hetzner, GCP, local, or a restore drill), and the script that verifies an `openthrottle` restore. **A row count does not prove a good restore** — embeddings can arrive NULL with every count matching, so the script exercises the extensions and a real nearest-neighbour query. SEEDING.md also covers restoring `cms` (§ 5b), and what the first deploy re-applies against restored data: nothing if the dump carried the `schema_migrations` ledger, every migration once (the cut-over) if it did not.
- `openthrottle/seed.sql` — ~45 MB local dump copied into the consumer-install seeded Postgres image (`applications/openthrottle/Dockerfile.Postgres`); gitignored, don't grep or edit it casually.
- [`openthrottle/TABLE_COMMENTS_AUDIT.md`](./openthrottle/TABLE_COMMENTS_AUDIT.md) — audit trail for the comment backfill effort.
