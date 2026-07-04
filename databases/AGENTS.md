# databases/ — agent notes

Family-shared notes for `databases/` (OpenThrottle Postgres schema + migrations). There are no child project files here; monorepo-wide rules live in the root [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md). Deep reference: [README.md](./README.md) (schema, embedding dimension strategy, commit links, status semantics, full migration list).

## Not an Nx project

No `package.json` here. Everything runs through root `pnpm run database:*` scripts (implemented in root `scripts/`) against the **root** `docker-compose.yml` Postgres/Redis.

## Migrations

- Numbered `NNN_snake_case.sql` files in [`migrations/`](./migrations/), applied in filename order by `pnpm run database:migrate` (`scripts/openthrottle-database-migrations.ts`).
- SQL files are the **single source of truth** for schema. TypeORM is runtime-only (DataSource pooling, entities for type safety); the TypeORM migration runner is deliberately not used.
- Never edit an applied migration in place — add a new numbered file. Comment backfills go in batch files (≤10 tables per file).
- Every `CREATE TABLE` must have `COMMENT ON TABLE` in the **same** migration file (tone model: `migrations/038_create_plan_runs_table.sql`; say "OpenThrottle", not "Cortex"). `COMMENT ON COLUMN` for non-obvious columns. Enforced diff-scoped vs `main` by `pnpm nx run monorepo:check-migration-table-comments` (also in `check:local`).
- Use idempotent DDL (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER`s). Patterns and naming: [.agents/skills/ot-postgres/SKILL.md](../.agents/skills/ot-postgres/SKILL.md).
- After a schema change, sync the TypeORM entities in `@openthrottle/nestjs-repositories` (entity JSDoc cites the migration numbers).

## Other contents

- [`backups/`](./backups/) — zip dumps from `pnpm run database:backup`. The migrate script itself does **not** back up; run a backup first before risky migrations.
- `seed.sql` — ~45 MB dump copied into the consumer-install seeded Postgres image (`applications/openthrottle/Dockerfile.Postgres`); don't grep or edit it casually.
- [`TABLE_COMMENTS_AUDIT.md`](./TABLE_COMMENTS_AUDIT.md) — audit trail for the comment backfill effort.
