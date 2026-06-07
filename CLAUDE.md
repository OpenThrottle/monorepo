@~/.claude/info.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenThrottle — an Nx + pnpm workspace monorepo (Node >= 22, pnpm only; `preinstall` blocks npm/yarn). It does both **task running** and **package publishing**. See [AGENTS.md](./AGENTS.md), [MONOREPO.md](./MONOREPO.md), and [CONTRIBUTING.md](./CONTRIBUTING.md) for deeper detail; `.cursor/rules/` is the single source of truth for code style.

**Agent/editor folders:** [docs/monorepo/agent-editor-folders.md](docs/monorepo/agent-editor-folders.md) — folder layout, Cursor vs Claude vs Ralph paths, duplication strategy, and where to edit. Claude-specific config: `.claude/settings.json`, `.claude/skills/` (mirror `.cursor/skills` for shared slugs).

## Commands

Always run tasks through Nx, prefixed with pnpm (`pnpm nx ...`), never the underlying tooling directly.

```bash
./scripts/setup.sh                                  # full environment setup/reset
pnpm run database:start                             # Postgres + Redis via docker compose
pnpm run database:migrate                           # backup + run migrations
pnpm nx run openthrottle-server:dev                 # NestJS GraphQL API
pnpm nx run openthrottle-developer:dev              # Developer UI (React Router)

pnpm nx run <project>:test                          # run a project's Vitest tests
pnpm nx run <project>:test -- path/to/file.test.ts  # single test file
pnpm nx run <project>:test --watch                  # watch mode
pnpm nx run <project>:lint
pnpm nx run <project>:typecheck
pnpm nx run <project>:typecheck-tests               # tsc on test files only — does NOT execute tests

pnpm nx affected --target=lint --parallel           # affected projects only
pnpm run check:local                                # full local CI parity (lint, typecheck, tests, codegen, knip)
pnpm nx:validate-tags                               # validate project tags
pnpm nx run monorepo:knip                           # dead-code report ONLY — never `knip --fix` on app UI
```

`typecheck-tests` and `test` are not interchangeable: the former only type-checks test files; only `test` executes Vitest assertions.

## Architecture

- **`applications/`** — deployable apps. `openthrottle-server` is the NestJS code-first GraphQL API; `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`, `openthrottle-website` are React Router (v7) + Vite apps.
- **`packages/`** — `@openthrottle/nestjs-*` (server modules: auth, bullmq, typeorm, redis, graphql, …), `@openthrottle/react-router-*` (shared UI/client libs), `openthrottle-agentic-*` / `openthrottle-workflows` (Ralph agentic tooling), `openthrottle-mcp` (the OT MCP server).
- **`tools/`** — Nx plugins, `@tools/generators` (scaffolding templates), `@tools/workflows` (Ralph CLI).
- **`databases/`** — OpenThrottle Postgres schema, migrations, local DB scripts.
- Every project carries Nx tags (`name:`, `type:`, `production:`, `technology:`) used for filtering and release; validate with `pnpm nx:validate-tags`.

### Source-first React Router packages (no `build` target)

The `packages/react-router-*` libraries (and a few others — see CONTRIBUTING.md for the full list of 16) intentionally have **no `build` target**: their `package.json` `main`/`types` point at `./src/index.ts` and consuming apps' Vite transpiles them. Do not add a `build` target to these. Validate them with `lint`/`typecheck`/`typecheck-tests`/`test`, then run `dev` or `build` on a consumer app (e.g. `openthrottle-developer`) as the integration check.

### GraphQL schema + codegen flow

Schema is **code-first** in `openthrottle-server` (NestJS `autoSchemaFile`); consumers read the committed **root `schema.gql`**. CI fails on drift. After changing GraphQL types/resolvers/documents:

1. Run `pnpm nx run openthrottle-server:dev` until bootstrap (writes `applications/openthrottle-server/schema.gql`), then stop.
2. `cp applications/openthrottle-server/schema.gql schema.gql`
3. `pnpm nx affected --target=codegen-graphql,codegen-react-router --parallel`
4. Commit both schema files and all `__generated__` output.

Never remove/change types on existing fields without a migration plan — use `@deprecated(reason: "...")`.

## Generators first

Before writing any new component, route, service, or package by hand, check `@tools/generators` and use it (see `.cursor/rules/personal-generators.mdc` and `docs/tools/templates/AGENT_USAGE.md`):

```bash
NX_ISOLATE_PLUGINS=false pnpm nx list @tools/generators
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:<name> --describe
NX_ISOLATE_PLUGINS=false pnpm nx g @tools/generators:react-router --subGenerator=component --application=<app> --folder=<folder> --name=<PascalCaseName>[,<MoreNames>]
```

All generator commands require the `NX_ISOLATE_PLUGINS=false` prefix. Generators exist for `react`, `react-router`, `nestjs`, `package`, and `folders`. Most sub-generators accept comma-separated `--name` values for batch scaffolding—confirm via `--describe` (`name.description`: `Comma-separated names supported.`). If no generator fits, say so explicitly before writing custom code.

## Code style (from .cursor/rules/)

- No new TypeScript enums — use `as const` objects (existing enums stay).
- Avoid `as` casts and `any`; use `import type` for type-only imports; explicit return types.
- `const` over `let`; `async/await` over `.then()`.
- Alphabetize arrays and object keys when order doesn't matter.
- UI: use components from `@openthrottle/react-router-shadcn` (source in `packages/react-router-shadcn/src/components`).
- Tests: use `component`, not `screen`, to get elements; `userEvent` instead of `fireEvent`.
- Exports that are package public API need a JSDoc `@publicApi` tag so Knip keeps them.

## Git and agent behavior

- Conventional commits, enforced by commitlint + Husky. **Never** add `Co-authored-by` or any attribution lines to commits or PRs — only conventional footers (`BREAKING CHANGE:`, `Closes #123`, `Plan-Id:`, `Task-Id:`) are allowed.
- Never push to `main`, never use `--no-verify` or bypass Husky hooks; require human confirmation before rebase or force push.
- PRs: use `.github/pull_request_template.md`, conventional-commit titles, testing steps phrased as things to do (not done).
- **Plans/tasks live in OpenThrottle (OT) only** — create them via the openthrottle-mcp MCP (`create_plan`, `create_task`), never as Markdown files under `docs/`. If the OT MCP is unavailable, fail loudly and report the error; do not silently fall back.
- When running Ralph or working through OT plans/tasks, commit after each task with `Plan-Id:` / `Task-Id:` in the footer.
