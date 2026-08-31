<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding with **`@tools/generators`** (`react-router`, `nestjs`, `react`, `package`, `folders`), ALWAYS invoke **`ot-generators`** FIRST — before MCP tools. See [`skills/ot-generators/SKILL.md`](./skills/ot-generators/SKILL.md) (`NX_ISOLATE_PLUGINS=false`, `pnpm nx`, comma-separated `--name` batching, AGENT_USAGE).
- For other scaffolding (apps/libs via Nx plugins, project structure, setup not covered by `@tools/generators`), read `nx_docs` or the plugin's own docs — there is no generic generator skill.

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- **`ot-generators`** covers `@tools/generators` discovery and flags — don't call nx_docs just to look up routine generator syntax

<!-- nx configuration end-->

## Per-project AGENTS.md

Agent context is layered in three tiers, and **each file states only what its parent tier does not** (the delta rule):

1. **This file + [CLAUDE.md](./CLAUDE.md)** — monorepo-wide conventions (Nx, pnpm-only, generators-first, OT plans, GraphQL codegen flow, code style, agent-asset SSOT).
2. **Area files** — [`applications/AGENTS.md`](./applications/AGENTS.md), [`packages/AGENTS.md`](./packages/AGENTS.md), [`tools/AGENTS.md`](./tools/AGENTS.md), [`databases/AGENTS.md`](./databases/AGENTS.md) — facts shared across one family (e.g. the source-first/no-build pattern, React Router app conventions, migration rules).
3. **Per-project `AGENTS.md`** — one per Nx project, carrying only that project's deltas: non-obvious commands, key paths, invariants/gotchas that break PRs, and boundaries.

When working inside a project, read its own `AGENTS.md` first, then its area file, then this file. When adding context, put it at the **most general tier that fully owns it** and link rather than duplicate downward; never restate a parent tier or the project's own `README.md`. There is no per-project `CLAUDE.md` — Claude Code and Cursor both read nested `AGENTS.md` natively.

## Agent and editor folders

For **where** agent- and editor-specific config lives (`.cursor/`, `.claude/`, `.agents/`, `skills/`, duplication strategy, where to edit for common tasks), see [docs/monorepo/agent-editor-folders.md](docs/monorepo/agent-editor-folders.md). **This file** covers cross-editor handbook topics (Nx, OT, workflow CLI); **that doc** covers physical layout and canonical ownership.

### Git worktrees (tool-agnostic)

Worktrees are handled by the portable [`ot-worktree`](skills/ot-worktree/SKILL.md) skill, which exposes **three composable actions**:

| Action      | Command                       | Job                                                                       |
| ----------- | ----------------------------- | ------------------------------------------------------------------------- |
| **create**  | `pnpm worktree:new <name>`    | Create the worktree, then run this repo's provisioner                     |
| **heal**    | `pnpm worktree:heal`          | Provision a worktree that was made outside the skill (runs before `:dev`) |
| **destroy** | `pnpm worktree:remove <name>` | Teardown hook, `git worktree remove`, prune                               |

The Claude `WorktreeCreate` hook and Cursor's `.cursor/worktrees.json` route through the same create action, so setup is **not** tool-specific. A plain `git worktree add` provisions nothing (git has no post-add hook) but self-heals on first `pnpm nx run <app>:dev`.

Worktrees live at `<root>/<org>/<repo>/<worktree>`; the root defaults to `~/.openthrottle/worktrees`, a hidden directory OpenThrottle owns outside every repo. Override the root with `OPENTHROTTLE_WORKTREE_ROOT` in the environment or in the target repo's `.env` (documented in `.env.default`) — OT always organizes `<org>/<repo>` beneath whatever root it gets, so a configured root behaves like the default. The org comes from the git remote, not the directory name, so two orgs' `monorepo` cannot collide. Worktrees created before this stay where they are — every action reads `git worktree list`.

`destroy` is deliberately conservative: it refuses the primary checkout, refuses a dirty worktree without `--force`, leaves the branch alone unless you pass `--delete-branch` (merged-only, unless also `--force`), and offers `--dry-run`. Details: [docs/monorepo/worktree-port-allocation.md](docs/monorepo/worktree-port-allocation.md).

### Contributor workflow (skills & rules)

| Action                       | Path                                           | Notes                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Write** skills             | [`skills/<slug>/SKILL.md`](./skills/)          | OT-owned skills are hand-authored here (SSOT). Install external ones 1:1: `npx skills add <owner>/<repo> --skill <name> --agent universal`. **Never** hand-edit `.agents/skills/` or `<agent>/skills/` — generated by ot-skill-sync. Policy + tracking: [docs/Skills.md](./docs/Skills.md). |
| **Write** rules              | [`.agents/rules/**/*.mdc`](./.agents/rules/)   | Sole SSOT (D3). Keep `.mdc` extension. Never edit `.cursor/rules/` copies — symlinks only.                                                                                                                                                                                                  |
| **Write** personas / prompts | `.agents/personas/`, `.agents/prompts/`        | Disk-only in MVP; DB ingest deferred to plan 1.5 (D2).                                                                                                                                                                                                                                      |
| **Load** in Cursor           | `.cursor/rules/`                               | Rule symlink views for the IDE. Skills fan out to `.claude/skills/` only; most tools read `.agents/skills/` natively.                                                                                                                                                                       |
| **Validate locally**         | `pnpm nx run monorepo:check-agent-assets-ssot` | Wraps ot-skill-sync `sync.sh --check` (skill layout) + `.cursor/rules` symlink integrity. Run `bash skills/ot-skill-sync/scripts/sync.sh` first to fix skill drift.                                                                                                                         |
| **DB index (read-only)**     | `custom_prompts` via GraphQL                   | Git is write authority; ingest from disk → DB is plan 1.5 — do not edit prompts in the DB.                                                                                                                                                                                                  |

**Prompt filename prefixes** (`.agents/prompts/`, no frontmatter — slug derives from the filename): `Before_*` / `After_*` are **lifecycle hooks** injected around a run; `Job_*` are **standalone scheduled runs** (recurring audits invoked via Ralph `--prompt-file` or an OT scheduled job) that are read-only on source and file their findings as a single OpenThrottle plan. Details: [docs/monorepo/agent-editor-folders.md](docs/monorepo/agent-editor-folders.md).

**Editor-native (not symlinked SSOT):** `.cursor/hooks.json`, `.cursor/mcp.json` (from `mcp.json`), `.cursor/worktrees.json`, generated `.cursor/rules/nx-rules.mdc` (gitignored). See [CONTRIBUTING.md](./CONTRIBUTING.md) § Agent assets.

## OpenThrottle Agent Skills

OT-owned skills are authored under [`skills/`](./skills/) and surfaced to every tool via the generated `.agents/skills/` view ([ot-skill-sync](./skills/ot-skill-sync/SKILL.md)). Each skill’s YAML `description` lists **USE WHEN** triggers; prefer these for OpenThrottle-specific workflows alongside the generic Nx skill (**nx-workspace**) above. Full policy + installed set: [docs/Skills.md](./docs/Skills.md).

- **ot-generators** — `@tools/generators`, `NX_ISOLATE_PLUGINS=false`, `pnpm nx`, AGENT_USAGE alignment: [`skills/ot-generators/SKILL.md`](./skills/ot-generators/SKILL.md)
- **ot-stack** — openthrottle-server GraphQL, databases/embeddings, openthrottle-developer UI, openthrottle-mcp package: [`skills/ot-stack/SKILL.md`](./skills/ot-stack/SKILL.md)
- **ot-postgres** — SQL migrations, `COMMENT ON TABLE` / column comments, idempotent DDL in `databases/migrations/`: [`skills/ot-postgres/SKILL.md`](./skills/ot-postgres/SKILL.md)
- **ot-plans** — openthrottle-mcp, plans/tasks, `Plan-Id` / `Task-Id`, post-merge work-ledger commit recording: [`skills/ot-plans/SKILL.md`](./skills/ot-plans/SKILL.md)
- **agents-ralph** — the Ralph loop prompt: one task at a time, status sync, commit cadence: [`skills/agents-ralph/SKILL.md`](./skills/agents-ralph/SKILL.md)
- **github-commit** — conventional commits, staging, `Plan-Id` / `Task-Id` footers: [`skills/github-commit/SKILL.md`](./skills/github-commit/SKILL.md)
- For the Ralph **CLI**, queue spawn vs orchestrator, and BullMQ wiring there is no skill — read [`tools/workflows/README.md`](./tools/workflows/README.md).

## Workflow CLI (@tools/workflows)

- **Discoverability:** Run `pnpm exec workflow-ralph --help` (and other bins) for usage. See `tools/workflows/README.md` for bin list.
- **Run:** `pnpm exec workflow-ralph --plan <openthrottle-plan-uuid>` (or `--task <openthrottle-task-uuid>` for task-centric). OpenThrottle (OT) required; see `tools/workflows/README.md`. Optional defaults: `.workflow-ralph.json` (see `.workflow-ralph.json.example`, `docs/workflows/ralph-config-migration.md`).
- **API queue (spawn vs orchestrator):** `enqueuePlanRun` runs nested `workflow-ralph` in the worker; `enqueuePlanRalphOrchestrator` runs the in-process GraphQL Ralph orchestrator (no child CLI). See `tools/workflows/README.md` § Worktree + BullMQ workflow. Docker, worker cwd, and compose follow-ups: investigation plan `677b6849-1912-4fa8-a5f6-d8233f2cdf97`.
- **Commit as you go, push once per plan:** When running Ralph (or working with OT plans/tasks), **commit after each task** — conventional commits, with `Plan-Id` and `Task-Id` in the body or footer (traceability is non-negotiable) — but **push once per plan, not once per task**. Every push to a branch with a ready PR triggers a full CI run, so an N-task plan used to cost N CI runs of a branch nobody was reviewing yet; batching gives the same total validation over one run. Keep the PR in **draft** until the last task is `COMPLETED`, then `gh pr ready`. Push mid-plan only when you genuinely need to (handing off, or a worktree at risk of being reaped). See [docs/monorepo/ci-cost.md](docs/monorepo/ci-cost.md). If `main` uses a merge queue, treat `gh pr merge --auto` as an **enqueue** step until the PR actually reports `mergedAt`; record OT work-ledger commits only after the queue lands the PR, using the landed `mergeCommitSha` / default-branch SHA rather than the branch head. See `databases/README.md` § Commit links.

## Code style and preferences

- **Location (SSOT):** [`.agents/rules/`](./.agents/rules/) — sole write location for code-writing preferences and style guide. See [`.agents/rules/README.md`](./.agents/rules/README.md). Use `coding/` for TypeScript/JS and structure; use `commands/` for OpenThrottle (OT), GitHub, and agent behavior. **Cursor loads** the same bodies via [`.cursor/rules/`](./.cursor/rules/) symlinks — edit `.agents/rules/` only.
- **Agent behavior (plans in OT only; fail loudly):** See [`.agents/rules/README.md`](./.agents/rules/README.md) § Agent behavior. That section is the single place for “plans in OpenThrottle only; fail loudly when unavailable”; Cursor and other tooling should follow it.
- **Frontend UI:** When building UI in the React Router apps, follow [`.agents/rules/coding/frontend-design-openthrottle.mdc`](./.agents/rules/coding/frontend-design-openthrottle.mdc) — the OpenThrottle overlay for the vendored `frontend-design` skill (React Router + `@openthrottle/react-router-shadcn`, generators + section-comment scaffold, component/data boundaries). Cursor loads it automatically; other agents should read it before UI work.

- **Package READMEs:** For `packages/**/README.md`, list **pnpm** first in install sections and use **`pnpm nx run <project>:<target>`** in Nx examples. Templates live under `tools/generators/src/generators/package/files/`; conventions are summarized in [CONTRIBUTING.md](./CONTRIBUTING.md) and [`.agents/rules/personal-generators.mdc`](./.agents/rules/personal-generators.mdc).
- **Knip (dead code):** Run **`pnpm nx run monorepo:knip`** for reports only. Do **not** run `knip --fix` or `knip --fix-type exports` on application UI—it strips intentional `export` on component prop types. Optional `knip --fix-type dependencies` only after human review. See [docs/monorepo/Knip.md](docs/monorepo/Knip.md). CI gate priorities and owners: [docs/monorepo/CI-quality-gates.md](docs/monorepo/CI-quality-gates.md). **CI cost model** — what CI costs, why the free tier depends on the repo being public, and the checklist before adding a job / changing a `runs-on` / adding a schedule: [docs/monorepo/ci-cost.md](docs/monorepo/ci-cost.md).

## OpenThrottle (OT) — plans knowledge base

- **OpenThrottle (OT)** is the plans/tasks knowledge base (semantic search over the OpenThrottle Postgres database). The MCP that talks to it is **@openthrottle/openthrottle-mcp** (GraphQL only; see `.cursor/mcp.json`). Use the **openthrottle-mcp** MCP server for all OT tools.
- **Registering MCP servers:** canonical guide — [docs/openthrottle/mcp-registration.md](docs/openthrottle/mcp-registration.md) (tiers, config locations, the openthrottle-mcp-only `.cursor/mcp.json` template, editor parity, user-provided servers).
- **Local verification:** Minimal server + developer-app flow: [docs/openthrottle/run-openthrottle-server-developer.md](docs/openthrottle/run-openthrottle-server-developer.md). MCP env, smoke checks, secondary workspace: [packages/openthrottle-mcp/docs/verification-environment.md](packages/openthrottle-mcp/docs/verification-environment.md).
- **First-time onboarding (after MCP + server work):** Guided mental model, prerequisites checklist, and a minimal copy-paste prompt sequence — [docs/openthrottle/first-time-onboarding.md](docs/openthrottle/first-time-onboarding.md).
- **Authoring plans & tasks from your editor/agent:** The mental model (plans/tasks as DB rows, `sortOrder`, status lifecycle) plus a copy-pasteable authoring loop — create → order → queue → commit with `Plan-Id`/`Task-Id` → record the squash on the work ledger on merge — with a full worked example: [docs/openthrottle/authoring-plans-via-mcp.md](docs/openthrottle/authoring-plans-via-mcp.md).
- **Rules:** [`.agents/rules/commands/openthrottle.mdc`](./.agents/rules/commands/openthrottle.mdc) — when to use which OT MCP tool ("ask OT", status queries, semantic search, list sources).
- **OT skills:** `ot-*` (authored in `skills/ot-*`, surfaced via the generated `.agents/skills/ot-*`) — `/ot-plans` for plan and task work (create, edit, list by status, ask the knowledge base), `/ot-loop` to drive a plan to completion, `/ot-onboarding` for orientation.
- For "ask OpenThrottle …" or "ask OT …" or "OT, …", follow the OT rule and use the **openthrottle-mcp** MCP server; answer only from retrieved chunks.
- **PRD summarization:** Plans and tasks have an optional `summary` field. Fill it at completion or when closing work with next actions, usage guides, or (for tasks) why blocked. See `databases/README.md` § PRD summarization.

### Plans in OT only; fail loudly

- **Plans and tasks MUST be created in OpenThrottle** via the OT MCP (`create_plan`, `create_task`). Do **not** create plans in Markdown files or under `docs/`.
- **If the OT MCP is unavailable or plan creation fails:** Report the error clearly to the user. Do **not** silently fall back to writing a plan to a `.md` file or skipping. Fail loudly so the user can fix the environment or connectivity.

## Local embeddings (Ollama)

- For local-only embedding (no OpenAI key): set **`OLLAMA_BASE_URL`** and/or **`OLLAMA_EMBEDDING_MODEL`**; `pnpm run database:import-docs` / `pnpm run database:import-agent-assets` and openthrottle-server then use Ollama when configured. See `databases/README.md` (embedding dimension strategy) and `scripts/ollama.sh`.
- **Cursor with a custom Ollama model:** start the proxy with **`pnpm ollama-proxy`** (requires Ollama and optionally Caddy at `https://ollama.local`). See [docs/monorepo/Ollama.md](docs/monorepo/Ollama.md) § Using Cursor with Ollama via the proxy and [tools/ollama-proxy/README.md](tools/ollama-proxy/README.md).
- **When using Caddy** (tools/caddy): set **`OLLAMA_BASE_URL`** to the Caddy-proxied URL so `database:import-docs`, `database:import-agent-assets`, and other consumers use one stable endpoint:
  - **Option B** (local domains): `https://ollama.local`
  - **Option A** (path-based): `https://localhost/ollama`
    See root `.env.default` and `docs/monorepo/Ollama.md`. For HTTPS with Caddy's local certs, trust Caddy's CA (or see tools/caddy/README.md) so Node/fetch and browsers do not hit certificate errors.
