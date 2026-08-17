# Performance

Find measured performance regressions in this monorepo — bundle growth, server hot paths, GraphQL cost, and build/test wall-clock — then file the findings as a single OpenThrottle plan. Every finding carries a number.

## Cadence

Weekly. Performance regresses one merge at a time and is only diagnosable while the responsible change is still recent: a route that grew 400 KB over a quarter is archaeology, but the same growth caught in a week points at one pull request. Weekly also gives a usable week-over-week baseline for bundle and build timings.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only). Run every task through Nx, prefixed with `pnpm` — never the underlying tooling directly.

Commands this job uses:

```bash
pnpm nx run <app>:build                    # produce a real bundle to measure
pnpm nx run <project>:test                 # time a suite
pnpm nx show project <project> --json      # targets and config
du -sh applications/<app>/build/**         # bundle sizes from a real build
git log --since='7 days ago' --oneline     # what landed in the measurement window
```

Facts that change the analysis:

- The four React Router (v8) + Vite apps are `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`, and `openthrottle-website`. Measure against a **production build**, never a dev server — dev-server numbers are meaningless here.
- `openthrottle-server` is NestJS with **code-first GraphQL**. Resolver cost and per-request work are the server-side subject.
- **Nx targets share a cache and build dependencies — run them sequentially, not in parallel.** Concurrent runs produce spurious failures and garbage wall-clock numbers, which is fatal for a job whose whole output is measurements.
- Gitignored `__generated__` output is **invisible to Nx hashing**, which has poisoned the remote cache before. A cache miss you cannot explain is itself a finding worth reporting.
- Vitest coverage is opt-in (`VITEST_COVERAGE=true`) and default-off; do not enable it while timing suites — it changes the numbers.
- The `openthrottle-developer` suite has a live sharding/pool history (`forks` vs `vmForks`, `vmMemoryLimit`, sharding). Test wall-clock findings in that app should account for the current config rather than re-proposing what already shipped.
- The repo already has an SWR-style caching-and-coalescing pattern in model discovery — when proposing a cache, point at that existing pattern rather than inventing a new one.
- Sixteen source-first `react-router-*` packages have no `build` target; their code is transpiled by the consuming app's Vite, so their weight shows up in the **app's** bundle, not their own.

## What to inspect

1. **Bundle size per route.** Build each React Router app and record per-route JS. Compare against the previous run's numbers (from the last plan this job filed) for week-over-week growth. Find heavy dependencies pulled into a shared chunk that only one route needs, duplicated dependencies at different versions, and server-only or oversized libraries reaching the client.
2. **Data-fetch waterfalls.** Loaders that `await` independent queries in sequence instead of in parallel; a child route re-fetching what its parent already loaded; GraphQL documents selecting fields the UI never reads; missing pagination on a list query.
3. **Server hot paths.** Resolvers doing per-request work that belongs in a cache; N+1 field resolvers; unbounded queries; work done per request that could be done once at boot.
4. **Build and test wall-clock.** Time the slowest Nx targets (sequentially). Identify cache-miss causes, targets rebuilding when nothing they depend on changed, and sharding opportunities. Report both cold and warm numbers — they answer different questions.
5. **Render cost.** Unmemoized expensive lists, context values recreated every render, effects re-running per keystroke, and components re-rendering on unrelated state changes.

## Ranking

Order findings by user-visible time saved per unit of work, with developer time second:

1. A regression that landed this week — cheapest to fix, since the cause is one identifiable change.
2. Per-route bundle weight on the most-used routes.
3. Server hot paths with unbounded cost — these get worse as data grows.
4. Waterfalls and over-fetching in loaders.
5. Build and test wall-clock — developer time, paid on every run.
6. Render-cost issues without a measured impact — usually not worth a task at all.

Cap the run at **10 findings**. If you find more, keep the top 10 and say in the plan description how many you dropped.

## Hard rules

- **Every finding must carry a measured before-number.** No number, no task — a perf task without evidence is a guess that costs someone a day. If you cannot measure it, say so in the plan description and drop it.
- **Read-only on source code.** Never edit, fix, optimize, or refactor anything. Building and running tests to gather measurements is allowed; changing code is not.
- Run Nx targets **sequentially**. Parallel runs invalidate the measurements this job exists to produce.
- Never open a pull request, never commit, never push.
- Never write a plan or task as a Markdown file anywhere — plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Do not run destructive or stateful commands (no migrations, no `database:reset`, no installs, no cache purges — a cache purge would destroy the baseline).
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans — a previous run of this job files plans titled `🔁 Performance: …`, and its numbers are your week-over-week baseline.
- `semantic_search` on each finding's subject (the route or target plus the specific cost) to catch a plan filed by a human or another job.

Then:

- If an open plan already covers a finding, **skip it** — unless the number has materially worsened since it was filed, in which case add the new measurement as a comment-style task on that plan rather than a new plan.
- If an open plan covers the area but misses a materially new finding, add that finding as a task to the existing plan (`create_tasks`).
- Only open a new plan for findings genuinely not represented anywhere.

Dedupe is not finished when you have checked for a duplicate _plan_. Three rules that apply every run:

- **Compare against the existing plan's tasks, not just its title.** When an open plan from this job exists, call `get_tasks_by_plan_id` on it and check each finding against the tasks already there, matching on the finding's subject (the specific hot path, bundle, or suite). File a task only for a subject no existing task covers. A run that re-files a finding the plan already carries has duplicated it, even though it opened no second plan.
- **Never file a task that contradicts an existing one.** If this sweep reaches a different verdict on a subject an existing task already covers, do not file an opposing task alongside it. Append the disagreement and your evidence to that task's description with `update_task`, so a human resolves one task instead of discovering the conflict halfway through executing the plan.
- **Say so when dedupe is degraded.** If `semantic_search` returns nothing for every query you try, treat the index as unavailable rather than as proof that no duplicate exists, and state that plainly in the plan description. "No duplicates found" and "I could not check for duplicates" must never look the same to whoever reads the plan.

## Output

Exactly one `create_plan`, followed by one `create_tasks` batch:

- **Title:** `🔁 Performance: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `performance`.
- **Description:** the full measurement table (per-route bundle sizes, target timings) so the next run has a baseline to compare against; the machine and conditions the numbers were taken under; how many findings were dropped by the cap; anything skipped as a duplicate.
- **Tasks:** one per finding, ordered by the ranking above, each fully self-contained:
  - the file, route, resolver, or target involved, with paths,
  - **the measured before-number and how it was measured**, as a command the reader can re-run,
  - the suspected cause, and the commit or pull request that introduced it where identifiable,
  - the proposed fix and the expected after-number,
  - explicit acceptance criteria stated as a measurement, not as a description.

If nothing material is found, **file nothing** and say so plainly — but still record this run's measurement table in your final message so the baseline is not lost. An empty run is a valid outcome; a padded plan is not.
