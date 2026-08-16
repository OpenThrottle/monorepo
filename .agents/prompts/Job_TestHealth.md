# Test health

Find where this monorepo is under-tested in the places it changes most, and where the test suite itself is unreliable or slow — then file the findings as a single OpenThrottle plan.

## Cadence

Weekly. Coverage debt accrues at the speed of merges, and flakiness compounds: a suite that fails 1-in-20 today is ignored by everyone within a month. Weekly is frequent enough to catch a newly-untested subsystem while the author still remembers it, and infrequent enough that the churn window (90 days) stays meaningful between runs.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only). Run every task through Nx, prefixed with `pnpm` — never the underlying tooling directly.

Commands this job uses:

```bash
pnpm run audit:test-coverage:json                   # machine-readable coverage/target audit (scripts/audit-test-coverage.ts)
pnpm run audit:test-coverage                        # same, human-readable
pnpm nx run <project>:test                          # run one project's Vitest suite
pnpm nx run <project>:test -- path/to/file.test.ts  # single test file
pnpm nx run <project>:typecheck                     # tsc over source AND tests — does NOT execute tests
pnpm nx show project <project> --json               # inspect a project's targets
git log --since='90 days ago' --name-only --pretty=format:                # churn source
```

Facts that change the analysis:

- `typecheck` and `test` are **not** interchangeable. `typecheck` runs `tsc` over source and test files and executes nothing. A project with a green `typecheck` and no real assertions is untested — treat it as such.
- Vitest coverage is **opt-in** in this repo (`VITEST_COVERAGE=true`); it is default-off because always-on coverage caused a flaky v8 ENOENT race. Do not assume coverage numbers exist for every project.
- The `openthrottle-developer` suite has a known pool history: it was moved from `vmForks` to `forks` to fix a crash, then to a sharded `vmForks` + `vmMemoryLimit` config. Pool/memory configuration is a legitimate flakiness cause here, not a theory.
- Nx targets share a cache and build dependencies — run targets **sequentially**, not in parallel, when timing them. Concurrent runs produce spurious failures and meaningless wall-clock numbers.
- A fresh worktree needs codegen before app suites will even collect: `pnpm nx run-many --target=codegen-graphql --all`. A collection error is not a coverage finding.
- Test conventions: use `component` (not `screen`) to get elements, and `userEvent` (not `fireEvent`). React Router apps share one Vitest setup via `setupReactRouterTest` from `@openthrottle/react-router-testing`.
- Projects live under `applications/`, `packages/`, and `tools/`; each carries Nx tags (`name:`, `type:`, `production:`, `technology:`).

## What to inspect

1. **Coverage weighted by churn.** Take `pnpm run audit:test-coverage:json` and join it against files changed in the last 90 days (`git log --since='90 days ago' --name-only`). Rank by (churn × coverage gap), **not** by raw coverage percentage. A 40%-covered file nobody has touched in a year is not a finding; a 60%-covered file with 30 commits is.
2. **Fake-tested projects.** Projects with a `test` target that assert nothing meaningful — empty suites, smoke tests that only mount, snapshot-only files, or suites whose assertions are all `expect(x).toBeDefined()`. Also flag projects relying on `typecheck` as if it were testing.
3. **Untested surfaces that matter.** New or heavily-changed GraphQL resolvers, loaders/actions, migrations, and shared package exports with no corresponding test file at all.
4. **Flaky candidates.** Re-run the three highest-churn suites 3× each (sequentially) and diff results. Any suite that is not deterministic across 3 runs is a finding. Note pool/config smells (`pool`, `poolOptions`, `maxWorkers`, `vmMemoryLimit`) and shared-state leaks between test files.
5. **Slow suites.** Record wall-clock per suite and call out the slowest few, with the specific win available (sharding, pool change, moving an integration test out of the unit suite, dropping a needless `beforeEach` rebuild).

## Ranking

Order findings by expected damage prevented per hour of work:

1. Zero coverage on a high-churn, production-tagged surface (`production:true`) — a bug here ships.
2. Flaky suites — they train the team to ignore red CI, which is worse than having no test.
3. Fake-tested projects — actively misleading; they read as safe.
4. Coverage gaps on moderate-churn code.
5. Slow suites — real cost, but only developer time.

Cap the run at **12 findings**. If you find more, keep the top 12 and say in the plan description how many you dropped.

## Hard rules

- **Read-only on source code.** Never edit, fix, or refactor anything. Running tests is allowed; changing them is not.
- Never open a pull request, never commit, never push.
- Never write a plan or task as a Markdown file anywhere — plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Do not run destructive or stateful commands (no migrations, no `database:reset`, no `knip --fix`, no installs).
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans — a previous run of this job files plans titled `🔁 Test health: …`.
- `semantic_search` on each finding's subject (project name + the specific problem) to catch a plan filed by a human or another job.

Then:

- If an open plan already covers a finding, **skip it** — do not re-file.
- If an open plan covers the area but misses a materially new finding, add that finding as a task to the existing plan (`create_tasks`) rather than opening a second plan.
- Only open a new plan for findings genuinely not represented anywhere.

## Output

Exactly one `create_plan`, followed by one `create_tasks` batch:

- **Title:** `🔁 Test health: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `testing`.
- **Description:** how the sweep was run, the commands used, how many findings were dropped by the cap, and anything you deliberately skipped as a duplicate.
- **Tasks:** one per finding, ordered by the ranking above, each fully self-contained — a reader with no access to this run must be able to act on it:
  - exact file and project paths,
  - a reproduction command they can paste,
  - the measured evidence (coverage number, failure rate across 3 runs, wall-clock seconds),
  - explicit acceptance criteria.

If nothing material is found, **file nothing** and say so plainly in your final message. An empty run is a valid outcome; a padded plan is not.
