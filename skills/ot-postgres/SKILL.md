---
name: ot-postgres
description: >-
  OpenThrottle Postgres SQL authoring: migrations in databases/migrations/,
  table design, naming, COMMENT ON TABLE/COLUMN standards, and idempotent DDL
  patterns. USE WHEN adding or editing SQL migrations, schema changes, table
  comments, or Postgres work under databases/ — not for routine OT plan CRUD
  (see ot-plans) or NestJS entity wiring alone (see openthrottle-stack).
source: openthrottle
---

# OpenThrottle Postgres (migrations and table comments)

## When to read this skill

- You add or edit files under **`databases/migrations/`**.
- You design new tables, indexes, or constraints for OpenThrottle Postgres.
- You backfill **`COMMENT ON TABLE`** / **`COMMENT ON COLUMN`** for existing tables.
- You need migration workflow or naming — start here, then read **`databases/README.md`** for full detail.

Use **openthrottle-stack** for embeddings, ingest scripts, and server/entity sync. Use **ot-plans** for plans/tasks MCP — not this skill.

## Table comment rules (required)

1. **Every new table** must have **`COMMENT ON TABLE`** in the **same migration file** as **`CREATE TABLE`**. Follow the tone in `databases/migrations/038_create_plan_runs_table.sql`: short, purpose-focused prose; use **"OpenThrottle"** in new comments.
2. **`COMMENT ON COLUMN`** is **optional** — add it for non-obvious fields (enums, JSONB shapes, snapshot columns, check-constraint semantics). See `038_create_plan_runs_table.sql` (`execution_backend`).
3. **Batch comment-only migrations** (e.g. `039_comment_on_*`, `050_comment_on_*`) are for **backfill or rename debt only** — **≤10 tables per file**. Do not split new table DDL from its table comment across files.
4. **Do not edit applied migrations in place** to add comments; add a new numbered batch file instead (audit: `databases/TABLE_COMMENTS_AUDIT.md`).

## Migration workflow (pointer)

Canonical commands and schema overview: **`databases/README.md`**.

| Step             | Command / path                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Apply migrations | `pnpm run database:migrate`                                                                         |
| New migration    | Next `NNN_snake_case.sql` in `databases/migrations/`                                                |
| Entity sync      | Update `@openthrottle/nestjs-repositories` entities to match SQL                                    |
| Local CI gate    | `pnpm nx run monorepo:check-migration-table-comments` (diff-scoped; also in `pnpm run check:local`) |

**Enforcement:** Changed migration files that introduce **`CREATE TABLE`** must include matching **`COMMENT ON TABLE`** for each created table in the **same file**. Base ref: `main` (override with `MIGRATION_COMMENT_LINT_BASE`).

## Patterns appendix (idempotent DDL)

Summarized from existing migrations — see **`databases/README.md`** for workflow; do not duplicate full README here.

```sql
-- Table + comment (038 pattern)
CREATE TABLE IF NOT EXISTS example_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE example_table IS 'One-line purpose for OpenThrottle agents and DB explorers.';

-- Optional column comment
COMMENT ON COLUMN example_table.id IS 'Surrogate key.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_example_table_created_at ON example_table (created_at DESC);

-- Triggers (reuse shared function)
DROP TRIGGER IF EXISTS update_example_table_updated_at ON example_table;
CREATE TRIGGER update_example_table_updated_at
  BEFORE UPDATE ON example_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Batch backfill only (no CREATE TABLE in same file)
COMMENT ON TABLE legacy_table IS 'Updated OpenThrottle prose after OpenThrottle rename.';
```

**Naming:** `snake_case` tables and columns; migration prefix `NNN_` zero-padded; prefer `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for re-runnable local dev.
