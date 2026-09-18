# databases/ — agent notes

Family-shared notes for `databases/` (OpenThrottle Postgres schema + migrations). There are no child project files here; monorepo-wide rules live in the root [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md). Deep reference: [README.md](./README.md) (schema, embedding dimension strategy, commit links, status semantics, full migration list).

## Not an Nx project

No `package.json` here. Everything runs through root `pnpm run database:*` scripts (implemented in root `scripts/`) against the **root** `docker-compose.yml` Postgres/Redis.

## Migrations

- Numbered `NNN_snake_case.sql` files in [`migrations/`](./migrations/), applied in filename order by `pnpm run database:migrate` (`scripts/openthrottle-database-migrations.ts`).
- Entrypoints for that runner: (1) `pnpm run database:migrate` — manual/standalone; (2) `monorepo:ensure-migrations` — the dev/start Nx gate (`scripts/ensure-migrations.ts`) wired into `openthrottle-server` `dev`/`dev-api`/`worker`/`start`, which waits for Postgres then auto-applies pending migrations before boot (fails fast pointing at `pnpm run database:start` if the DB is down); (3) `Dockerfile.Migrations` + the compose `migrations` init service — authoritative for container installs, unchanged.
- SQL files are the **single source of truth** for schema. TypeORM is runtime-only (DataSource pooling, entities for type safety); the TypeORM migration runner is deliberately not used.
- Never edit an applied migration in place — add a new numbered file. Comment backfills go in batch files (≤10 tables per file).
- Every `CREATE TABLE` must have `COMMENT ON TABLE` in the **same** migration file (tone model: `migrations/038_create_plan_runs_table.sql`; say "OpenThrottle"). `COMMENT ON COLUMN` for non-obvious columns. Enforced diff-scoped vs `main` by `pnpm nx run monorepo:check-migration-table-comments` (also in `check:local`).
- Use idempotent DDL (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER`s). Patterns and naming: [skills/ot-postgres/SKILL.md](../skills/ot-postgres/SKILL.md).
- After a schema change, sync the TypeORM entities in `@openthrottle/nestjs-repositories` (entity JSDoc cites the migration numbers).

## Other contents

- [`backups/`](./backups/) — zip dumps from `pnpm run database:backup`. The migrate script itself does **not** back up; run a backup first before risky migrations.
- [`backup-offsite.sh`](./backup-offsite.sh) — host-level nightly `pg_dump` shipped off the box via rclone, with retention mirroring `DATABASE_BACKUP_RETENTION_COUNT`. **The app's own scheduled backup job cannot run on a deployed box** — it spawns `pnpm run database:backup` in a workspace checkout, which a distroless image does not have — so this is the only database backup on a deployment. Wired as a systemd timer by the Hetzner cloud-init.
- [`SEEDING.md`](./SEEDING.md) + [`verify-restore.sh`](./verify-restore.sh) — provider-agnostic runbook for loading a dump into a fresh database (Hetzner, GCP, local, or a restore drill), and the script that verifies it. **A row count does not prove a good restore** — embeddings can arrive NULL with every count matching, so the script exercises the extensions and a real nearest-neighbour query. SEEDING.md also documents that the containerized `migrations` runner has **no ledger** and re-applies all 118 migrations on every deploy, unlike `pnpm run database:migrate`.
- `seed.sql` — ~45 MB dump copied into the consumer-install seeded Postgres image (`applications/openthrottle/Dockerfile.Postgres`); don't grep or edit it casually.
- [`TABLE_COMMENTS_AUDIT.md`](./TABLE_COMMENTS_AUDIT.md) — audit trail for the comment backfill effort.
