---
name: ot-postgres
description: >-
  OpenThrottle Postgres SQL authoring: migrations in databases/<db>/migrations/
  (openthrottle, cms),
  table design, naming, COMMENT ON TABLE/COLUMN standards, and idempotent DDL
  patterns. USE WHEN adding or editing SQL migrations, schema changes, table
  comments, or Postgres work under databases/ — not for routine OT plan CRUD
  (see ot-plans) or NestJS entity wiring alone (see ot-stack).
metadata:
  author: openthrottle
  last-reviewed: '2026-11-14'
  version: '1.1.0'
---

# OpenThrottle Postgres (migrations and table comments)

Use **ot-stack** for embeddings, ingest scripts, and server/entity sync. Use **ot-plans** for plans/tasks MCP.

## Which database? (decide first)

Each database (`databases/database-registry.ts`) has its own `migrations/`, numbering and ledger:
`openthrottle` for everything `openthrottle-server` reads, `cms` for `openthrottle-cms` content
(`databases/cms/README.md`). **No foreign keys across databases** — store the id by value. Pick the
next number from **that database's** folder on `main`.

## Table comment rules (required)

1. **Every new table** must have **`COMMENT ON TABLE`** in the **same migration file** as **`CREATE TABLE`**. Follow the tone of the `create_plan_runs_table` migration: short, purpose-focused prose; use **"OpenThrottle"** in new comments (**"OpenThrottle CMS"** in the `cms` database).
2. **`COMMENT ON COLUMN`** is **optional** — add it for non-obvious fields (enums, JSONB shapes, snapshot columns, check-constraint semantics). See `execution_backend` in the same migration.
3. **Batch comment-only migrations** (the `comment_on_openthrottle_tables_batch_*` files) are for **backfill or rename debt only** — **≤10 tables per file**. Do not split new table DDL from its table comment across files.
4. **Do not edit applied migrations in place** to add comments; add a new numbered batch file instead (audit: `databases/openthrottle/TABLE_COMMENTS_AUDIT.md`).

## Migration workflow (pointer)

Canonical commands and schema overview: **`databases/openthrottle/README.md`**.

| Step             | Command / path                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Apply migrations | `pnpm run database:migrate` (every DB; `-- --database <name>` for one)                               |
| New migration    | Next `NNN_snake_case.sql` in `databases/<db>/migrations/` — check the tip of `main`, not your branch |
| Entity sync      | `openthrottle` only: update `@openthrottle/nestjs-repositories-server` entities to match SQL         |
| Local CI gate    | `pnpm nx run monorepo:check-migration-table-comments` (diff-scoped; also in `pnpm run check:local`)  |

**Enforcement:** Changed migration files that introduce **`CREATE TABLE`** must include matching **`COMMENT ON TABLE`** for each created table in the **same file**. Base ref: `main` (override with `MIGRATION_COMMENT_LINT_BASE`).

**Naming:** `snake_case` tables and columns; migration prefix `NNN_` zero-padded.

## Gotchas

- **Never put an inline `REFERENCES` inside a statement guarded by `IF NOT EXISTS`.** The guard skips the whole statement when the table or column exists, so the constraint never lands while the ledger still records the migration as applied. Enforced by `pnpm nx run monorepo:check-migration-hygiene` (in `check:local` and CI).
- **One migration per `NNN_` prefix.** `check-migration-hygiene` judges collisions against the tip of the base ref, not your merge-base, so pick your number from `main`. `pnpm exec tsx ./scripts/check-migration-hygiene.ts --all` judges the whole tree.
- **Never renumber a migration once merged to `main`.** `schema_migrations` keys on `filename`, so a rename re-runs it wherever it applied and orphans the old row. Before merge, renumber freely: branch migrations belong on a throwaway DB (`pnpm worktree:db isolate`). Orphan on the shared DB: `databases/AGENTS.md` § Ledger orphans.
- **Editing an applied migration in place** changes its checksum, which the runner reports as drift (warn-only). Add a new numbered file instead.
- Repairing existing tables: prefer `ADD CONSTRAINT ... NOT VALID` then `VALIDATE CONSTRAINT`, which avoids a blocking scan.
- Do not switch from numeric to timestamp prefixes on your own initiative; see `databases/openthrottle/README.md` § One migration per numeric prefix.

## Patterns

Create the shape first, then add the foreign key in its own statement guarded on `pg_constraint`:

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_plan_id_fkey') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE CASCADE;
  END IF;
END
$$;
```

Reuse the shared `updated_at` trigger function:

```sql
DROP TRIGGER IF EXISTS update_example_table_updated_at ON example_table;
CREATE TRIGGER update_example_table_updated_at
  BEFORE UPDATE ON example_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```
