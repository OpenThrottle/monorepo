@~/.claude/info.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenThrottle — an Nx + pnpm workspace monorepo (Node >= 22, pnpm only; `preinstall` blocks npm/yarn). It does both **task running** and **package publishing**. See [AGENTS.md](./AGENTS.md), [MONOREPO.md](./MONOREPO.md), and [CONTRIBUTING.md](./CONTRIBUTING.md) for deeper detail; `.agents/rules/` is the single source of truth for code style (Cursor loads the same bodies via `.cursor/rules/` symlinks).

**Agent/editor folders:** [docs/monorepo/agent-editor-folders.md](docs/monorepo/agent-editor-folders.md) — folder layout, Cursor vs Claude vs Ralph paths, duplication strategy, and where to edit. Claude-specific config: `.claude/settings.json`, `.claude/skills/` — a generated fan-out from `.agents/skills/`; Cursor reads `.agents/skills/` directly, so there is no `.cursor/skills` copy. Never hand-edit either generated dir; edit `skills/` and re-sync.

## Commands

Always run tasks through Nx, prefixed with pnpm (`pnpm nx ...`), never the underlying tooling directly.

```bash
./scripts/setup.sh                                  # full environment setup/reset (also seeds the default login user)
pnpm run worktree:new <name>                        # create + provision a git worktree (the ONE entrypoint; Claude/Cursor use it too). A plain `git worktree add` self-heals on first `:dev`
pnpm run database:start                             # Postgres + Redis via docker compose
pnpm run database:migrate                           # apply pending migrations manually (run-once/idempotent via schema_migrations ledger; safe to re-run, no data re-stamp; does NOT back up)
pnpm nx run openthrottle-server:dev                 # NestJS GraphQL API (auto-applies pending migrations first via monorepo:ensure-migrations; fails fast if Postgres is down)
pnpm nx run openthrottle-developer:dev              # Developer UI (React Router)

pnpm nx run <project>:test                          # run a project's Vitest tests
pnpm nx run <project>:test -- path/to/file.test.ts  # single test file
pnpm nx run <project>:test --watch                  # watch mode
pnpm nx run <project>:lint
pnpm nx run <project>:typecheck                     # tsc over source AND test files — does NOT execute tests

pnpm nx affected --target=lint --parallel           # affected projects only
pnpm run check:local                                # full local CI parity (lint, typecheck, tests, codegen, knip)
pnpm nx:validate-tags                               # validate project tags
pnpm nx run monorepo:knip                           # dead-code report ONLY — never `knip --fix` on app UI
```

`typecheck` and `test` are not interchangeable: `typecheck` type-checks source and test files (`tsc`, no execution); only `test` executes Vitest assertions.

## Picking the right models for workflows and subagents

Rankings, higher = better. Cost reflects what I actually pay (OpenAI has really generous limits), not list price. Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy.

| model    | cost | intelligence | taste |
| -------- | ---- | ------------ | ----- |
| sonnet-5 | 5    | 5            | 7     |
| opus-4.8 | 4    | 7            | 8     |
| fable-5  | 2    | 9            | 9     |

How to apply:

- These are defaults, not limits. You have standing permission to override them: if a cheaper model's output doesn't meet the bar, rerun or redo the work with a smarter model without asking. Judge the output, not the price tag. Escalating costs less than shipping mediocre work.
- Cost is a tie-breaker only; when axes conflict for anything that ships, intelligence > taste > cost.
- Bulk/mechanical work (clear-spec implementation, data analysis, migrations): sonnet-5 - it's effectively free.
- Anything user-facing (UI, copy, API design) needs taste ≥ 7.
- Reviews of plans/implementations: fable-5 or opus-4.8, optionally sonnet-5 as an extra independent perspective.
- Never use Haiku.
- Claude models (sonnet-5, opus-4.8, fable-5) run via the Agent/Workflow model parameter.

## Architecture

- **`applications/`** — deployable apps. `openthrottle-server` is the NestJS code-first GraphQL API; `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`, `openthrottle-website` are React Router (v8) + Vite apps.
- **`packages/`** — `@openthrottle/nestjs-*` (server modules: auth, bullmq, typeorm, redis, graphql, …), `@openthrottle/react-router-*` (shared UI/client libs), `openthrottle-agentic-*` (Ralph agentic tooling), `openthrottle-mcp` (the OT MCP server).
- **`tools/`** — Nx plugins, `@tools/generators` (scaffolding templates), `@tools/workflows` (Ralph CLI).
- **`databases/`** — OpenThrottle Postgres schema, migrations, local DB scripts.
- Every project carries Nx tags (`name:`, `type:`, `production:`, `technology:`) used for filtering and release; validate with `pnpm nx:validate-tags`.

### Source-first React Router packages (no `build` target)

The `packages/react-router-*` libraries (and a few others — see [MONOREPO.md](./MONOREPO.md) § "Projects without a `build` target" for the pattern, and `packages/AGENTS.md` for the `__build` placeholder discriminator) intentionally have **no `build` target**: their `package.json` `main`/`types` point at `./src/index.ts` and consuming apps' Vite transpiles them. Do not add a `build` target to these. Validate them with `lint`/`typecheck`/`test`, then run `dev` or `build` on a consumer app (e.g. `openthrottle-developer`) as the integration check. Audit the set by grepping `package.json` for the `__build` placeholder: Nx _infers_ a `build` target from a package's `vite.config.ts`, so `pnpm nx show projects --with-target=build` lists source-first packages too and cannot tell you which set is which.

### GraphQL schema + codegen flow

Schema is **code-first** in `openthrottle-server` (NestJS `autoSchemaFile`); consumers read the committed **`applications/openthrottle-server/schema.gql`** (via `@openthrottle/graphql-codegen`'s `defineCodegen`). CI fails on codegen drift. After changing GraphQL types/resolvers/documents:

1. Run `pnpm nx run openthrottle-server:dev` until bootstrap, then stop. The `dev`/`start` targets run with `cwd` at the project root, so `autoSchemaFile: 'schema.gql'` writes `applications/openthrottle-server/schema.gql` — the single committed schema file.
2. `pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel`
3. Commit the app `schema.gql` and all `__generated__` output.

Never remove/change types on existing fields without a migration plan — use `@deprecated(reason: "...")`.

## Generators first

Before writing any new component, route, service, or package by hand, check `@tools/generators` and use it (see `.agents/rules/personal-generators.mdc` and `docs/tools/templates/AGENT_USAGE.md`):

```bash
NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<name> --describe
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --subGenerator=component --application=<app> --folder=<folder> --name=<PascalCaseName>[,<MoreNames>]
```

All generator commands require the `NX_ISOLATE_PLUGINS=false` prefix. Generators exist for `react`, `react-router`, `nestjs`, `package`, and `folders`. Most sub-generators accept comma-separated `--name` values for batch scaffolding—confirm via `--describe` (`name.description`: `Comma-separated names supported.`). If no generator fits, say so explicitly before writing custom code.

## Code style (from .agents/rules/)

- No new TypeScript enums — use `as const` objects (existing enums stay).
- Avoid `as` casts and `any`; use `import type` for type-only imports; explicit return types.
- `const` over `let`; `async/await` over `.then()`.
- Alphabetize arrays and object keys when order doesn't matter.
- UI: use components from `@openthrottle/react-router-shadcn` (source in `packages/react-router-shadcn/src/components`).
- Tests: use `component`, not `screen`, to get elements; `userEvent` instead of `fireEvent`. React Router apps share one Vitest setup — `tests/setup.ts` is a single `setupReactRouterTest({ env: { APP_NAME: '<app>' } })` call from `@openthrottle/react-router-testing` (jsdom polyfills + `window.env` fixture + baked-in `afterEach(cleanup)`); don't re-add those shared shims per app.
- Exports that are package public API need a JSDoc `@public` tag so Knip keeps them.

## Git and agent behavior

- Conventional commits, enforced by commitlint + Husky. **Never** add `Co-authored-by` or any attribution lines to commits or PRs — only conventional footers (`BREAKING CHANGE:`, `Closes #123`, `Plan-Id:`, `Task-Id:`) are allowed.
- Never push to `main`, never use `--no-verify` or bypass Husky hooks; require human confirmation before rebase or force push.
- PRs: use `.github/pull_request_template.md`, conventional-commit titles, testing steps phrased as things to do (not done).
- **Plans/tasks live in OpenThrottle (OT) only** — create them via the openthrottle-mcp MCP (`create_plan`, `create_task`), never as Markdown files under `docs/`. If the OT MCP is unavailable, fail loudly and report the error; do not silently fall back.
- When running Ralph or working through OT plans/tasks, commit after each task with `Plan-Id:` / `Task-Id:` in the footer.
- On merge-queue-protected branches, treat `gh pr merge --auto` as an **enqueue** step until `gh pr view --json mergedAt,mergeCommitSha` shows the landed squash commit. Record OT work-ledger artifacts only from that landed SHA, never from the branch head that was pushed.
