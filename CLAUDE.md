<!-- @~/.claude/info.md -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenThrottle — an Nx + pnpm workspace monorepo (Node >= 26, pnpm only; `preinstall` blocks npm/yarn). It does both **task running** and **package publishing**. See [AGENTS.md](./AGENTS.md), [MONOREPO.md](./MONOREPO.md), and [CONTRIBUTING.md](./CONTRIBUTING.md) for deeper detail. Code style is normative in [AGENTS.md](./AGENTS.md) § Code style, with rationale and examples in [docs/monorepo/code-style.md](docs/monorepo/code-style.md).

**Agent/editor folders:** [docs/monorepo/agent-editor-folders.md](docs/monorepo/agent-editor-folders.md) — folder layout, Cursor vs Claude vs Ralph paths, duplication strategy, and where to edit. Claude-specific config: `.claude/settings.json`, `.claude/skills/` — a generated fan-out from `.agents/skills/`; Cursor reads `.agents/skills/` directly, so there is no `.cursor/skills` copy. Never hand-edit either generated dir; edit `skills/` and re-sync.

## Commands

Always run tasks through Nx, prefixed with pnpm (`pnpm nx ...`), never the underlying tooling directly.

```bash
./scripts/setup.sh                                  # full environment setup/reset (also seeds the default login user)
pnpm run worktree:new <name>                        # create + provision a git worktree (the ONE entrypoint; Claude/Cursor use it too). A plain `git worktree add` self-heals on first `:dev`
pnpm run worktree:db isolate                        # give THIS worktree its own Postgres/Redis (base+8/+9) + migrate + seed; a shared-DB worktree refuses branch-only migrations until you do. `worktree:new <name> --own-db` does it at create time
pnpm run worktree:serve <server|developer>          # IN A WORKTREE: run its own server/UI detached, wait for the port, print a probe (`--api-only`, `--stop`; `--orphans` lists servers left running from removed worktrees). See docs/monorepo/worktree-port-allocation.md
pnpm run database:start                             # Postgres + Redis via docker compose (a worktree reuses the primary's: OT_WORKTREE_DB=shared)
pnpm run database:migrate                           # apply pending migrations manually (run-once/idempotent via schema_migrations ledger; safe to re-run, no data re-stamp; does NOT back up)
pnpm nx run openthrottle-server:dev                 # NestJS GraphQL API (auto-applies pending migrations first via monorepo:ensure-migrations; fails fast if Postgres is down)
pnpm nx run openthrottle-developer:dev              # Developer UI (React Router)

pnpm nx run <project>:test                          # run a project's Vitest tests
pnpm nx run <project>:test -- path/to/file.test.ts  # single test file (a vitest filter; `--testFile` was the removed Nx executor's option and Vitest rejects it)
pnpm nx run <project>:test --watch                  # watch mode
pnpm nx run <project>:lint
pnpm nx run <project>:typecheck                     # tsc over source AND test files — does NOT execute tests

pnpm nx affected --target=lint --parallel           # affected projects only
pnpm run check:local                                # full local CI parity (lint, typecheck, tests, codegen, knip)
pnpm nx:validate-tags                               # validate project tags
pnpm nx run monorepo:knip                           # dead-code report ONLY — never `knip --fix` on app UI
pnpm nx sync:check                                  # report tsconfig project-reference drift (`pnpm nx sync` fixes it)
```

`typecheck` and `test` are not interchangeable: `typecheck` type-checks source and test files (`tsc`, no execution); only `test` executes Vitest assertions.

**`nx sync` maintains tsconfig project references — use it.** `pnpm nx sync:check` reports drift (and gates `check:local`); `pnpm nx sync` fixes it, and you inspect the diff before committing. The generator is deliberately **not** attached to the task pipeline, so `nx run`/`affected` never sync for you and never fail on drift — attaching it would hard-fail every non-TTY shell while protecting nothing in CI. An `applications/*` → `applications/*` reference is always wrong. Full reasoning and measurements: [docs/monorepo/NX.md](docs/monorepo/NX.md#nx-sync--the-typescript-project-reference-sync).

## Picking the right models for workflows and subagents

Rankings, higher = better. Cost reflects what I actually pay (OpenAI has really generous limits), not list price. Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy.

| model    | current version | cost | intelligence | taste |
| -------- | --------------- | ---- | ------------ | ----- |
| `sonnet` | Sonnet 5.5      | 5    | 6            | 7     |
| `opus`   | Opus 5.5        | 4    | 8            | 8     |
| `fable`  | Fable 5.2       | 2    | 9            | 9     |

How to apply:

- These are defaults, not limits. You have standing permission to override them: if a cheaper model's output doesn't meet the bar, rerun or redo the work with a smarter model without asking. Judge the output, not the price tag. Escalating costs less than shipping mediocre work.
- Cost is a tie-breaker only; when axes conflict for anything that ships, intelligence > taste > cost.
- Bulk/mechanical work (clear-spec implementation, data analysis, migrations): sonnet - it's effectively free.
- Anything user-facing (UI, copy, API design) needs taste ≥ 7.
- Reviews of plans/implementations: fable or opus, optionally sonnet as an extra independent perspective.
- Never use Haiku.
- Claude models run via the Agent/Workflow model parameter using the aliases `sonnet` / `opus` / `fable`, which always resolve to the latest version in each family.

## Architecture

- **`applications/`** — deployable apps. `openthrottle-server` is the NestJS code-first GraphQL API; `openthrottle-developer`, `openthrottle-admin`, `openthrottle-website` are React Router (v8) + Vite apps; [`openthrottle-app`](applications/openthrottle-app/README.md) is the Electron desktop shell around the developer app.
- **`packages/`** — `@openthrottle/nestjs-*` (server modules: auth, bullmq, redis, graphql, …; `nestjs-repositories-server` is the `openthrottle` database's TypeORM layer), `@openthrottle/react-router-*` (shared UI/client libs), `openthrottle-agentic-*` (Ralph agentic tooling), `openthrottle-mcp` (the OT MCP server).
- **`tools/`** — Nx plugins, `@tools/generators` (scaffolding templates), `@tools/workflows` (Ralph CLI).
- **`databases/`** — the Postgres databases (`openthrottle`, `cms`), one folder and one migration ledger each, sharing one runner and one server; local DB scripts.
- Every project carries Nx tags (`name:`, `type:`, `production:`, `technology:`) used for filtering and release; validate with `pnpm nx:validate-tags`.

### Source-first React Router packages (no `build` target)

The `packages/react-router-*` libraries (and a few others — see [MONOREPO.md](./MONOREPO.md) § "Projects without a `build` target" for the pattern, and `packages/AGENTS.md` for the `__build` placeholder discriminator) intentionally have **no `build` target**: their `package.json` `main`/`types` point at `./src/index.ts` and consuming apps' Vite transpiles them. Do not add a `build` target to these. Validate them with `lint`/`typecheck`/`test`, then run `dev` or `build` on a consumer app (e.g. `openthrottle-developer`) as the integration check. Audit the set by grepping `package.json` for the `__build` placeholder: Nx _infers_ a `build` target from a package's `vite.config.ts`, so `pnpm nx show projects --with-target=build` lists source-first packages too and cannot tell you which set is which.

### GraphQL schema + codegen flow

Schema is **code-first** in `openthrottle-server` (NestJS `autoSchemaFile`); consumers read the committed **`applications/openthrottle-server/schema.gql`** (via `@openthrottle/graphql-codegen`'s `defineCodegen`). CI fails on codegen drift. After changing GraphQL types/resolvers/documents:

1. Run `pnpm nx run openthrottle-server:graphql-schema:write` (no Postgres, Redis or running server needed). It is the only producer of the committed `applications/openthrottle-server/schema.gql`: booting the server keeps the schema in memory and never writes the file. `dev` on a codegen consumer runs the equivalent `graphql-schema-write` first, so a new field plus a document selecting it needs no manual step there.
2. `pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel`
3. Commit the app `schema.gql` and all `__generated__` output.

Never remove/change types on existing fields without a migration plan — use `@deprecated(reason: "...")`.

## Generators first

Before writing any new component, route, service, or package by hand, check `@tools/generators` and use it. Every invocation needs the `NX_ISOLATE_PLUGINS=false` prefix. If no generator fits, say so explicitly before writing custom code.

**Do not scaffold from memory or from an example copied out of this file — there is none, deliberately.** Which generator scaffolds what (notably `react` for packages vs `react-router` for applications) is decided in one place: `docs/tools/templates/AGENT_USAGE.md`. Load the `ot-generators` skill first; it is the agent entry point and carries the discovery workflow (`list` → `--describe` → `--list=<key>` → execute).

## Code style

[AGENTS.md](./AGENTS.md) § Code style is the normative list (it loads alongside this file every session, so it is not repeated here); [docs/monorepo/code-style.md](docs/monorepo/code-style.md) has the rationale and examples. One Claude-relevant detail it does not carry: React Router apps share one Vitest setup — `tests/setup.ts` is a single `setupReactRouterTest({ env: { APP_NAME: '<app>' } })` call from `@openthrottle/react-router-testing` (jsdom polyfills + `window.env` fixture + baked-in `afterEach(cleanup)`); don't re-add those shared shims per app.

## Git and agent behavior

- Conventional commits, enforced by commitlint + Husky. No agent attribution anywhere — see [AGENTS.md](./AGENTS.md) § No agent attribution.
- Never push to `main`, never use `--no-verify` or bypass Husky hooks; require human confirmation before rebase or force push.
- PRs: use `.github/pull_request_template.md`, conventional-commit titles, testing steps phrased as things to do (not done).
- Plans live in OT only, follow-ups are OT plans, and commit/push cadence and the work ledger are in [AGENTS.md](./AGENTS.md) § Plans in OT only and § Workflow CLI.
