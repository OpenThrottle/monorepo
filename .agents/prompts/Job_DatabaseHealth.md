# Database health

Find schema, migration, and query problems in this monorepo's Postgres layer — then file the findings as a single OpenThrottle plan.

## Cadence

Biweekly. Schema changes land less often than application code, and the failure modes this job hunts (a missing index, an unbounded table, entity drift) take weeks to become painful rather than days. Biweekly matches the rate at which migrations actually accumulate, and keeps each run's report small enough to act on in one sitting.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only). Run every task through Nx, prefixed with `pnpm` — never the underlying tooling directly.

The database layer lives in `databases/` — read `databases/README.md` first; it is the source of truth for schema conventions. Migrations are SQL files in `databases/migrations/`. The NestJS server (`applications/openthrottle-server`) reaches Postgres through TypeORM entities and `@openthrottle/nestjs-typeorm`.

Commands this job uses:

```bash
pnpm run check:local:migration-comments    # nx run monorepo:check-migration-table-comments
pnpm run database:start                    # Postgres + Redis via docker compose (read-only inspection only)
psql "$DATABASE_URL" -c '\d+ <table>'      # inspect a live table, if a local DB is already running
git log --since='90 days ago' --name-only -- databases/migrations
```

Facts that change the analysis:

- Migrations are applied through a **`schema_migrations` ledger** and are run-once / idempotent — `pnpm run database:migrate` is safe to re-run and does not re-stamp rows. A migration that would break on re-run is still a finding; the ledger protects against the common case, not against bad DDL.
- The repo standard **requires `COMMENT ON TABLE` and `COMMENT ON COLUMN`**, and `check:local:migration-comments` is the gate that enforces it. Run the gate before reading files by hand.
- The server auto-applies pending migrations on `dev` (via `monorepo:ensure-migrations`) and fails fast if Postgres is down.
- GraphQL is **code-first** in `openthrottle-server`; the committed schema is `applications/openthrottle-server/schema.gql`. Field resolvers are where N+1 patterns appear — a resolver that queries per parent row is the pattern to hunt.
- Several tables grow with agent activity and have no natural bound: plan output streams, run records, logs, token-usage rows. Retention is a real, recurring concern here, not a hypothetical.
- `databases/` also holds local DB scripts; `database:reset` destroys data — never run it.

## What to inspect

1. **Migration hygiene.** Read the migrations added since the last run (and spot-check older ones): non-idempotent DDL, missing `IF NOT EXISTS` / `IF EXISTS` guards, statements that would fail if applied twice, ordering hazards (a migration depending on an object a later file creates), destructive statements with no backfill, and column drops with no deprecation window.
2. **Comment coverage.** Run `pnpm run check:local:migration-comments` and triage. Beyond the gate, look for comments that exist but say nothing ("the id column").
3. **Index gaps.** Foreign keys with no supporting index; columns used in `WHERE`/`ORDER BY`/`JOIN` by hot resolvers with no index; unique constraints that should exist and do not. Also the reverse: duplicate indexes, and indexes covering the same leading columns as another.
4. **Entity ↔ schema drift.** Compare TypeORM entities against the migration-defined schema: nullability mismatches, type mismatches, columns present in one and absent in the other, defaults declared in the entity but not the database (or vice versa). Drift here produces runtime errors that no test catches.
5. **N+1 risk.** GraphQL field resolvers issuing a query per parent row where a dataloader or a join belongs. Rank by how large the parent list can get — an N+1 on a list capped at 5 is theoretical; one on an unpaginated list is a production incident.
6. **Unbounded growth.** Tables with no retention, pruning, or archival story — run outputs, logs, token usage, notifications. For each, state the growth driver and a proposed retention policy.

## Ranking

Order findings by the damage they do when they finally bite:

1. Entity ↔ schema drift that will throw at runtime — silent until the wrong row shows up.
2. A missing index on a query path that scales with data volume — fine today, an outage at 10×.
3. Unbounded tables with no retention — a slow, certain problem.
4. Migration hygiene problems that would break a fresh environment bootstrap.
5. N+1 patterns on unbounded lists.
6. Missing or empty `COMMENT ON` coverage — cheap, mechanical, and it makes every future audit faster.

Cap the run at **12 findings**. If you find more, keep the top 12 and say in the plan description how many you dropped.

## Hard rules

- **Read-only on source code AND on the database.** Never edit an entity, never write or edit a migration, never run DDL, never `INSERT`/`UPDATE`/`DELETE`. Reading (`\d+`, `SELECT`, `EXPLAIN`) against a local development database is allowed; anything that mutates state is not.
- **Never run `pnpm run database:reset`**, never drop or truncate anything, never run a migration against a shared database.
- Never open a pull request, never commit, never push.
- Never write a plan or task as a Markdown file anywhere — plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Never include real row data, credentials, or personal information from the database in the plan text — describe shapes and counts, not contents.
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans — a previous run of this job files plans titled `🔁 Database health: …`, and there is existing migration and retention work in the backlog.
- `semantic_search` on each finding's subject (the table name plus the specific problem) to catch a plan filed by a human or another job.

Then:

- If an open plan already covers a finding, **skip it** — do not re-file.
- If an open plan covers the table or migration but misses a materially new finding, add that finding as a task to the existing plan (`create_tasks`) rather than opening a second plan.
- Only open a new plan for findings genuinely not represented anywhere.

## Output

Exactly one `create_plan`, followed by one `create_tasks` batch:

- **Title:** `🔁 Database health: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `database`.
- **Description:** how the sweep was run, whether a live database was available for inspection (and if not, that findings are static-analysis only), how many findings were dropped by the cap, and anything skipped as a duplicate.
- **Tasks:** one per finding, ordered by the ranking above, each fully self-contained:
  - the table, column, entity file, and migration file involved, with paths,
  - the evidence (`EXPLAIN` output, index list, the entity/schema diff, the resolver that issues the per-row query),
  - the proposed fix, expressed as **what the migration should do** — never as a written migration file,
  - explicit acceptance criteria, including that `pnpm run check:local:migration-comments` passes and the migration is idempotent under re-run.

If nothing material is found, **file nothing** and say so plainly in your final message. An empty run is a valid outcome; a padded plan is not.
