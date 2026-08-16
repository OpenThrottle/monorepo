# Architecture drift

Find where this monorepo's structural boundaries have eroded — crossed project lines, wrong tags, deep imports, packages that grew targets they must not have — then file the findings as a single OpenThrottle plan.

## Cadence

Biweekly. Structural drift is invisible day to day and expensive to reverse: each violation makes the next one look normal, and by the time a boundary breaks a Docker build, a dozen files depend on the wrong shape. Biweekly is often enough to catch a violation while it is still one file, and rare enough that the report stays strategic rather than nitpicky.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only) that does both task running and package publishing. Run every task through Nx, prefixed with `pnpm` — never the underlying tooling directly.

Layout:

- **`applications/`** — deployable apps. `openthrottle-server` is the NestJS code-first GraphQL API; `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`, `openthrottle-website` are React Router (v8) + Vite apps.
- **`packages/`** — `@openthrottle/nestjs-*` server modules, `@openthrottle/react-router-*` shared UI/client libraries, `openthrottle-agentic-*` agentic tooling, `openthrottle-mcp`.
- **`tools/`** — Nx plugins, `@tools/generators`, `@tools/workflows`.
- **`databases/`** — Postgres schema, migrations, local DB scripts.

Commands this job uses:

```bash
pnpm nx:validate-tags                      # scripts/nx-validate-tags.ts
pnpm run nx:validate                       # tags + projects + configurations
pnpm nx graph --file=/tmp/graph.json       # project dependency graph as JSON
pnpm nx show project <project> --json      # a project's targets, tags, and config
pnpm run audit:component-shape             # includes the 210-line component cap
```

Facts that change the analysis:

- Every project carries Nx tags — `name:`, `type:`, `production:`, `technology:` — used for filtering and release. Wrong tags silently exclude a project from CI filters and release runs.
- Sixteen packages are deliberately **source-first**: `packages/react-router-*` and a few others have **no `build` target**; their `package.json` `main`/`types` point at `./src/index.ts` and consuming apps' Vite transpiles them. Adding a `build` target to one of these is a violation, not an improvement. Validate them with `lint`/`typecheck`/`test`, then build a consumer app as the integration check.
- Conversely, **packages the server imports need top-level exports pointing at `dist`** — a missing top-level export surfaces as a type-stripping error in the Docker build, not locally.
- **No deep package imports.** Consume a package through its main entry and re-export from `index.ts`; do not add a subpath export for a single symbol.
- The IDE engine has a hard **server/client boundary**: `openthrottle-ide` is Node-only, `react-router-ide` imports types only, and the crossing is done with `*.server.ts` files plus dynamic import. Breaking this puts Node built-ins into a browser bundle.
- Components have a **210-line cap** and one exported component per file, enforced by `audit:component-shape`.
- `nx sync` is **disabled deliberately** in this repo — it has injected bogus tsconfig references and circular deps. Never run it, and never file a finding that recommends it; use `check:tsconfig-refs` instead.
- Generated `__generated__` output is invisible to Nx hashing; do not treat it as a source-of-truth dependency edge.

## What to inspect

1. **Tags.** Run `pnpm nx:validate-tags`. Beyond what it enforces, review by hand: projects missing a tag dimension, a `type:` that no longer matches what the project became, `production:true` on something that is not deployed (or missing from something that is).
2. **Cross-project boundaries.** Apps importing another app's internals; packages importing an application; server-only code reachable from a client bundle; violations of the `*.server.ts` + dynamic-import boundary; Node built-ins imported into browser-bound code.
3. **Import shape.** Deep package imports (`@openthrottle/x/src/y`) instead of the main entry; imports that reach around an `index.ts` barrel; relative imports crossing a project root.
4. **Target-shape violations.** Source-first packages that have grown a `build` target; server-consumed packages missing top-level exports to `dist`; projects missing the standard `lint`/`typecheck`/`test` targets; targets without descriptions.
5. **Size and cohesion.** Files over the 210-line component cap; god-routes and god-modules doing several unrelated jobs; modules with far more imports than their siblings.
6. **Graph health.** Circular dependencies in the project graph; a package depended on by everything (a hidden god-package); two packages that depend on each other in practice through a third.
7. **Duplication across packages.** The same concern implemented independently in two or more places — a candidate for extraction. Only file this when the duplicate implementations have actually diverged in behavior; identical small helpers are not worth a plan.

## Ranking

Order findings by blast radius — what breaks, and how far from the change it breaks:

1. A boundary violation that will break the Docker build or ship Node code to the browser — fails far from its cause, usually in CI or production.
2. Wrong Nx tags — silently excludes a project from CI filters and release, so nothing tells you it is wrong.
3. Circular dependencies and hidden god-packages — they make every future change harder.
4. Source-first packages with a `build` target, and missing top-level exports.
5. Deep imports and barrel violations.
6. Diverged duplicate implementations.
7. Oversized files and god-routes — real debt, but locally contained.

Cap the run at **12 findings**. If you find more, keep the top 12 and say in the plan description how many you dropped.

## Hard rules

- **Read-only on source code.** Never edit, fix, or refactor anything — no moved files, no changed tags, no adjusted imports. Filing the finding is the job.
- **Never run `nx sync`.** It is disabled in this repo on purpose; it injects bogus tsconfig references and circular dependencies. Do not recommend it in a finding either.
- Never open a pull request, never commit, never push.
- Never write a plan or task as a Markdown file anywhere — plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Do not run destructive or stateful commands (no migrations, no `database:reset`, no installs, no generators). Building is allowed for evidence, but run Nx targets **sequentially** — they share a cache, and concurrent runs produce spurious failures.
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans — a previous run of this job files plans titled `🔁 Architecture drift: …`, and there is existing boundary, tag, and component-shape work in the backlog.
- `semantic_search` on each finding's subject (the project name plus the specific violation) to catch a plan filed by a human or another job.

Then:

- If an open plan already covers a finding, **skip it** — do not re-file.
- If an open plan covers the project but misses a materially new violation, add that finding as a task to the existing plan (`create_tasks`) rather than opening a second plan.
- Only open a new plan for findings genuinely not represented anywhere.

## Output

Exactly one `create_plan`, followed by one `create_tasks` batch:

- **Title:** `🔁 Architecture drift: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `tooling`.
- **Description:** how the sweep was run, the commands used, how many findings were dropped by the cap, and anything skipped as a duplicate.
- **Tasks:** one per finding, ordered by the ranking above, each fully self-contained:
  - the projects and files involved, with paths,
  - the boundary or convention violated, stated explicitly,
  - what breaks and where it will surface (local, CI, Docker build, runtime),
  - the proposed restructuring, including which projects need re-validation afterward,
  - explicit acceptance criteria, including that `pnpm nx:validate-tags` passes and `lint`/`typecheck`/`test` stay green for every touched project.

If nothing material is found, **file nothing** and say so plainly in your final message. An empty run is a valid outcome; a padded plan is not.
