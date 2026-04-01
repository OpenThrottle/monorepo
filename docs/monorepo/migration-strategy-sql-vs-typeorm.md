# Migration strategy: SQL-as-source vs TypeORM migrations

This document compares two approaches for managing Postgres schema changes in a stack that uses TypeORM for runtime (connection pooling, entities, raw SQL). It is written for **greenfield** evaluation: assume no existing migration history. For the current Cortex setup (SQL files + `cortex:migrate`), see `databases/cortex/README.md` § Migrations.

## Approach 1: SQL files as source of truth + custom script

- **Schema:** Plain `.sql` files in version control (e.g. `databases/<db>/migrations/`), applied in filename order.
- **Execution:** A custom script (e.g. `scripts/run-cortex-migrations.ts`) reads the directory, sorts by name, and runs each file against the database. Optionally, a “migrations run” table records which filenames have been applied so only new ones run; otherwise, migrations are written to be **idempotent** (e.g. `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
- **Runtime:** TypeORM is used only for connection and querying; entities are kept in sync with the SQL schema manually (entity JSDoc references migration numbers).

### Pros

- **Single source of truth:** Schema lives in readable, diffable SQL. No generated code; no drift between “entity” and “what actually ran.”
- **Full control:** Any valid SQL is allowed (extensions, triggers, partial indexes, pgvector, etc.). TypeORM’s migration API does not support every Postgres feature.
- **Tooling-agnostic:** No dependency on TypeORM’s migration runner. The same SQL can be run by any client (CLI, CI, scripts).
- **Clear history:** One ordered list of files. Easy to review, revert (by adding a new migration), and onboard new contributors.
- **CI/CD friendly:** Run one command (e.g. `pnpm run cortex:migrate`); no need to install or configure TypeORM’s migration CLI per project.
- **Rollback:** Rollback is explicit: add a new migration that reverses the change. No “revert last migration” magic; history stays linear and auditable.

### Cons

- **Manual sync:** After adding or changing a migration, entities (and any NestJS/TypeORM repositories) must be updated by hand to match the schema. Easy to forget and cause runtime mismatches.
- **No auto-generation from entities:** Schema changes start from SQL, not from entity edits. Teams that prefer “change entity → generate migration” need discipline to instead “write SQL → update entity.”
- **Applied state (optional):** If the script does *not* use a “migrations run” table, every run re-executes all files, so migrations must be idempotent. If it *does* track applied migrations, the script and table become part of the contract to maintain.
- **Duplicate effort:** Two places to touch for one logical change: migration file and entity (and possibly repository types).

---

## Approach 2: TypeORM migrations (generated or hand-written)

- **Schema:** TypeORM tracks schema via a **migrations** table and runs classes or SQL files that implement `MigrationInterface` (up/down). Migrations can be **generated** from entity diff (`typeorm migration:generate`) or **hand-written**.
- **Execution:** `typeorm migration:run` (or framework-specific equivalent) runs pending migrations in order. Only migrations not present in the migrations table are executed.
- **Runtime:** Entities are the primary schema definition; migrations are often generated from entity changes.

### Pros

- **Single place to define schema (if using generate):** Change entities; run `migration:generate` to produce a migration. Reduces “forgot to update the entity” mistakes when the workflow is entity-first.
- **Built-in “already applied” tracking:** TypeORM’s migrations table records which migrations ran. No need to make every migration idempotent.
- **Revert support:** `migration:revert` runs the `down()` method of the last applied migration. Useful for local dev and controlled rollbacks.
- **Framework integration:** Fits naturally into NestJS/TypeORM apps; one DataSource, same config for app and migrations.
- **Type safety:** Generated migrations reflect entity types; less risk of typos in column names when using the generator.

### Cons

- **Limited SQL surface:** TypeORM’s migration API and generator do not support every Postgres feature (e.g. pgvector, complex triggers, partial indexes). Hand-written SQL in migrations is possible but then you maintain both entity and SQL.
- **Two sources of truth if hand-writing:** If you hand-write migrations and keep entities in sync manually, you have the same “two places” problem as SQL-as-source, plus TypeORM’s migration runner and table to maintain.
- **Generator pitfalls:** Generated migrations can be noisy, rename columns unnecessarily, or produce destructive changes. Review and edit are often required.
- **Vendor lock-in:** Tied to TypeORM’s migration format and CLI. Harder to run the same migrations from a non-Node script or another tool.
- **History complexity:** Mixing “generated” and “hand-written” migrations can make history harder to reason about. Greenfield projects can stay consistent; existing SQL-first histories (like Cortex) would require a one-time conversion and possibly a separate migrations table.

---

## Comparison summary

| Dimension            | SQL-as-source + custom script     | TypeORM migrations                    |
|---------------------|------------------------------------|----------------------------------------|
| **Maintainability** | One clear history (SQL only)      | Can be one (generate) or two (entity + migration) |
| **Tooling**         | Any runner; simple script         | TypeORM CLI; framework-coupled         |
| **Rollback**        | New migration that reverses       | `migration:revert` (per migration)     |
| **Team ergonomics** | “Write SQL → update entity”       | “Change entity → generate” or hand-write |
| **Long-term**       | Portable; not tied to TypeORM     | Tied to TypeORM; generator limits      |
| **Postgres features** | Full (raw SQL)                  | Generator limited; raw SQL possible   |

For **greenfield** Postgres + TypeORM projects where you need **full SQL** (e.g. pgvector, triggers, exotic indexes), **SQL-as-source with a small runner** is the more flexible long-term choice. For projects that stay within TypeORM’s generator and prefer **entity-first** workflow, **TypeORM migrations** are convenient. A concrete recommendation for this repo (Cortex and similar) is in `databases/cortex/README.md` § Migration strategy (TypeORM vs SQL).

---

## Recommendation (long-term)

**Use SQL files as the single source of truth and a custom script to apply them.** TypeORM stays for runtime only (DataSource, entities, raw SQL); do not use TypeORM’s migration runner for schema changes.

**Rationale:**

1. **Postgres-first:** This stack uses Postgres features (pgvector, partial indexes, triggers) that TypeORM’s migration generator does not support well. Raw SQL avoids fighting the ORM and keeps one readable history.
2. **Portability:** The same migrations can be run by any client (Node script, CI, DBA tools). No lock-in to TypeORM’s CLI or migrations table format.
3. **Single history:** One ordered list of `.sql` files. No “generated vs hand-written” split; no conversion if we ever change ORMs.
4. **Trade-off we accept:** Entities must be updated manually after schema changes. We mitigate with JSDoc that references migration numbers (e.g. “Matches databases/cortex/migrations (002, 012)”) and review in PRs.

**Where this is documented:** This doc (`docs/monorepo/migration-strategy-sql-vs-typeorm.md`) holds the full pros/cons and recommendation. `databases/cortex/README.md` § Migration strategy (TypeORM vs SQL) states the choice for Cortex and points here.
