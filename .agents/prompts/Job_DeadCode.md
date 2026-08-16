# Dead code

Find code and dependencies this monorepo carries but no longer uses — then file the findings as a single OpenThrottle plan. Report only; never delete anything yourself.

## Cadence

Weekly. Dead code is cheap to find and cheap to remove **only while it is fresh** — once a dead export has been dead for six months, nobody remembers whether it was load-bearing, and removing it becomes a research task instead of a delete. Weekly keeps the report small enough to act on.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only). Run every task through Nx, prefixed with `pnpm` — never the underlying tooling directly.

Commands this job uses:

```bash
pnpm nx run monorepo:knip                  # dead-code report (unused files, exports, types, deps)
pnpm nx show projects                      # project inventory
pnpm nx show project <project> --json      # a project's targets and config
pnpm nx graph --file=/tmp/graph.json       # project dependency graph as JSON
git log -1 --format=%ci -- <path>          # last touch date for a file
git blame -L <line>,<line> <file>          # age of a TODO/FIXME or commented-out block
```

Facts that change the analysis:

- **Never run `knip --fix`**, especially on app UI. Knip's autofix has removed live UI code in this repo before. This job is report-only, full stop.
- Exports that are part of a package's public API need a JSDoc `@public` tag so Knip keeps them. A knip "unused export" hit on a package's public surface is usually a **missing annotation**, not dead code — classify it that way.
- Sixteen packages are **source-first**: `packages/react-router-*` and a few others have no `build` target; their `package.json` `main`/`types` point at `./src/index.ts` and consuming apps' Vite transpiles them. Their entry points are reachable through consumers, not through a build output.
- **No deep package imports.** Packages are consumed through their main entry and re-export from `index.ts`. An export that looks unused may be re-exported from an index — check before calling it dead.
- Generated output (`__generated__` directories, `schema.gql`) is written by codegen, not by hand. Never report generated files as dead code; report the generator config if the generator itself is unused.
- A fresh worktree may need `pnpm nx run-many --target=codegen-graphql --all` before analysis is meaningful — missing `__generated__` output makes real imports look unresolved.
- Projects live under `applications/`, `packages/`, and `tools/`, each carrying Nx tags (`name:`, `type:`, `production:`, `technology:`).

## What to inspect

1. **Knip report triage.** Run `pnpm nx run monorepo:knip` and classify every hit into exactly one bucket: (a) genuinely dead — delete; (b) public API missing a `@public` JSDoc tag — annotate; (c) false positive from a dynamic import, a config-file reference, or generated code — note and ignore. Never report a hit without a bucket.
2. **Dependency debt.** Across every workspace `package.json`: dependencies declared but never imported; the same dependency at conflicting versions across packages; deps hoisted to the root that belong to one package (or vice versa); `dependencies` that should be `devDependencies` (and the reverse — anything a published package imports at runtime must not be a devDependency).
3. **Orphaned files.** Files with no importers, no test referencing them, and no Nx target pointing at them. Cross-check against the project graph before calling a file orphaned — entry points and plugin files are referenced by config, not by imports.
4. **Stale in-code debt.** Commented-out blocks, and `TODO`/`FIXME`/`HACK` comments older than six months. Include the `git blame` date for each. A three-week-old TODO is work in progress; an eighteen-month-old TODO is a decision nobody made.
5. **Dead projects.** Whole projects nothing depends on and nothing deploys — no consumers in the graph, not tagged `production:true`, no target anyone runs.

## Ranking

Order findings by how much they cost to keep:

1. Unused runtime dependencies in production-tagged projects — they inflate installs, Docker images, and the CVE surface.
2. Dead whole files and dead projects — the largest surface removed per unit of review effort.
3. Missing `@public` annotations — cheap, mechanical, and they make every future knip run quieter.
4. Misplaced or version-conflicting dependencies.
5. Dead exports inside live files.
6. Stale TODOs and commented-out blocks.

Cap the run at **15 findings, grouped by project** — one task per project, listing that project's items, so each task is a single focused sitting. If you find more, keep the top 15 and say in the plan description how many you dropped.

## Hard rules

- **Read-only on source code.** Never edit, fix, or refactor anything. Never run `knip --fix`. Never delete a file, an export, or a dependency.
- Never open a pull request, never commit, never push.
- Never write a plan or task as a Markdown file anywhere — plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Do not run destructive or stateful commands (no migrations, no `database:reset`, no installs, no lockfile changes).
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans — a previous run of this job files plans titled `🔁 Dead code: …`, and there is existing knip triage work in the backlog.
- `semantic_search` on each finding's subject (project name + the specific export or dependency) to catch a plan filed by a human or another job.

Then:

- If an open plan already covers a finding, **skip it** — do not re-file.
- If an open plan covers the project but misses a materially new finding, add that finding as a task to the existing plan (`create_tasks`) rather than opening a second plan.
- Only open a new plan for findings genuinely not represented anywhere.

## Output

Exactly one `create_plan`, followed by one `create_tasks` batch:

- **Title:** `🔁 Dead code: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `tooling`.
- **Description:** how the sweep was run, the commands used, the knip false-positive rate you observed, how many findings were dropped by the cap, and anything skipped as a duplicate.
- **Tasks:** one per project, ordered by the ranking above, each fully self-contained:
  - exact file paths and export names,
  - for every item, the explicit verdict — **delete**, **annotate with `@public`**, or **move/re-scope the dependency**,
  - the evidence (knip output line, importer count, `git blame` date),
  - explicit acceptance criteria, including that `pnpm nx run monorepo:knip` gets quieter and lint/typecheck/test stay green for the touched projects.

If nothing material is found, **file nothing** and say so plainly in your final message. An empty run is a valid outcome; a padded plan is not.
