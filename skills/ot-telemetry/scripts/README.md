# scripts/

The bundled executable for `ot-telemetry`. Must follow the contract in
[`../SKILL.md`](../SKILL.md): read-only Postgres access, a bounded time window, aggregate-only
output by default, and `report.json` / `report.md` written to a local scratch directory only —
never uploaded, never a network call beyond the local Postgres connection.

## Layout

- `report.ts` — CLI entry point. Parses flags, connects, probes, builds the envelope, and writes
  `report.json` / `report.md` to `--out`. Run it with
  `pnpm exec tsx skills/ot-telemetry/scripts/report.ts [flags]`.
- `lib/connection.ts` — resolves the Postgres URL with the repo's standard env precedence
  (`OPENTHROTTLE_POSTGRES_URL` → `POSTGRES_URL` → `POSTGRES_*` pieces, matching
  `databases/run-migrations.mjs` and `getPostgresUrl` in `@openthrottle/openthrottle-agentic-utils`,
  which it calls directly rather than re-deriving) and opens the session read-only
  (`default_transaction_read_only`). Fails loudly, naming every env var it tried, rather than ever
  emitting a half-empty report.
- `lib/capability-probe.ts` — a single round trip against `information_schema.tables` /
  `information_schema.columns`, exposed as an in-memory `hasTable`/`hasColumns` map.
- `lib/metric-registry.ts` — the seam later tasks register metric families against: a
  `MetricQuery` declares the tables/columns it needs, and `runMetricQueries` skips (with a
  reason) any query the capability probe can't satisfy instead of letting it throw.
- `lib/envelope.ts` — the versioned report envelope shape (`schemaVersion`, `generatedAt`,
  `window`, `detailLevel`, `actorKey`, `repoSlug`, `migrationHighWaterMark`, `skipped`, `metrics`).
- `lib/actor-key.ts` / `lib/repo-slug.ts` — derive the envelope's `actorKey` (salted, non-reversible
  hash of the git email) and `repoSlug` (`org/repo` from the git remote) without shelling out to
  anything beyond `git` itself.
- `lib/migration-high-water-mark.ts` — reads `max(filename)` from `schema_migrations` (the ledger
  has no numeric id; the zero-padded filename prefix sorts in applied order).
- `lib/count-types.ts` — shared `CategoryCount`/`StatusCount`/`TagCount` shapes (label + count
  only) reused by the plan and task metric families.
- `lib/window-count.ts` — `countInWindow`, the created/completed-in-window counting strategy
  shared by plans and tasks: sums `daily_stats`' pre-aggregated per-day totals for the window's
  interior full UTC days and live-counts only the (almost always partial) edges, falling back to a
  single live count over the whole window when `daily_stats` can't answer for a given day. Reports
  which strategy ran (`daily_stats` / `hybrid` / `live`) alongside the count.
- `lib/plan-metrics.ts` — registers `metrics.plans` (lifetime total, created/completed-in-window,
  status/category distribution, zero-task plan count, median/p90 time-to-complete) and
  `metrics.plan_tags` (tag vocabulary distribution) as two separate `MetricQuery`s, so a database
  missing `plan_tags` alone doesn't lose the rest of the plan metrics.
- `lib/task-metrics.ts` — registers `metrics.tasks` (lifetime total, created/completed-in-window,
  status/category distribution, tasks-per-plan min/median/p90/max, completion rate in window) and
  `metrics.task_tags` (tag vocabulary distribution), same two-query split as plans.
- `lib/skill-usage-metrics.ts` — registers `metrics.skill_usage` (invocation counts, session
  spread, agent-type/hook-event/privacy-level distributions, daily time series) and
  `metrics.skill_usage_outcomes` (outcome mix, event-outcome coverage, duration percentiles), same
  two-query split.
- `lib/model-metrics.ts` — registers `metrics.model_token_usage` (token/cost sums by provider and
  by model, daily time series, cache hit ratio), `metrics.favorite_models`, and
  `metrics.disabled_agent_clis` as three separate `MetricQuery`s.
- `lib/agent-run-metrics.ts` — registers `metrics.plan_runs`, `metrics.work_sessions`,
  `metrics.agent_conversations`, and `metrics.scheduled_agent_jobs` as four separate
  `MetricQuery`s.
- `lib/cli-args.ts` — parses and validates `--since`/`--until`/`--out`/`--detail`/`--format`;
  `defaultOutDir()` is a scratch dir under the OS temp dir, deliberately outside this repo, so the
  default can never be accidentally committed.
- `lib/metric-type-guards.ts` — one type predicate per metric family, narrowing the envelope's
  erased `Record<string, unknown>` metrics bag back to each family's real interface for the
  Markdown renderer to consume, without an `as` cast.
- `lib/markdown-report.ts` — renders an envelope into `report.md`: a headline paragraph, the
  `skipped` list, and a small (row-capped) table per metric family.

## Status

All 13 metric families are registered and the full CLI flag surface plus Markdown rendering are
implemented — see `../SKILL.md` for the flag table and the privacy contract per `--detail` level.
