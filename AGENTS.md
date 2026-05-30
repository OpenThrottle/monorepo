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

- For scaffolding with **`@tools/generators`** (`react-router`, `nestjs`, `react`, `package`, `folders`), ALWAYS invoke **`openthrottle-generators`** FIRST — before `nx-generate` or MCP tools. See [`.agents/skills/openthrottle-generators/SKILL.md`](./.agents/skills/openthrottle-generators/SKILL.md) (`NX_ISOLATE_PLUGINS=false`, `pnpm nx`, AGENT_USAGE).
- For other scaffolding (apps/libs via Nx plugins, project structure, setup not covered by `@tools/generators`), invoke **`nx-generate`** FIRST before exploring or calling MCP tools.

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- **`openthrottle-generators`** covers `@tools/generators` discovery and flags; **`nx-generate`** covers other Nx generators — don't call nx_docs just to look up routine generator syntax

<!-- nx configuration end-->

## Cursor Agent Skills (OpenThrottle)

Repo-local skills live under [`.agents/skills/`](./.agents/skills/). Each skill’s YAML `description` lists **USE WHEN** triggers; prefer these for OpenThrottle-specific workflows alongside generic Nx skills (**nx-workspace**, **nx-generate**, **nx-run-tasks**) above.

- **openthrottle-generators** — `@tools/generators`, `NX_ISOLATE_PLUGINS=false`, `pnpm nx`, AGENT_USAGE alignment: [`.agents/skills/openthrottle-generators/SKILL.md`](./.agents/skills/openthrottle-generators/SKILL.md)
- **openthrottle-stack** — openthrottle-server GraphQL, databases/embeddings, openthrottle-developer UI, mcp-developer package: [`.agents/skills/openthrottle-stack/SKILL.md`](./.agents/skills/openthrottle-stack/SKILL.md)
- **ot-plans** — mcp-developer, plans/tasks, `Plan-Id` / `Task-Id`, post-merge `link_commit`: [`.agents/skills/ot-plans/SKILL.md`](./.agents/skills/ot-plans/SKILL.md)
- **workflow-ralph** — CLI, queue spawn vs orchestrator, commit cadence: [`.agents/skills/workflow-ralph/SKILL.md`](./.agents/skills/workflow-ralph/SKILL.md)

## Workflow CLI (@tools/workflows)

- **Discoverability:** Run `pnpm exec workflow-ralph --help` (and other bins) for usage. See `tools/workflows/README.md` for bin list.
- **Run:** `pnpm exec workflow-ralph --plan <openthrottle-plan-uuid>` (or `--task <openthrottle-task-uuid>` for task-centric). OpenThrottle (OT) required; see `tools/workflows/README.md`. Optional defaults: `.workflow-ralph.json` (see `.workflow-ralph.json.example`, `docs/workflows/ralph-config-migration.md`).
- **API queue (spawn vs orchestrator):** `enqueuePlanRun` runs nested `workflow-ralph` in the worker; `enqueuePlanRalphOrchestrator` runs the in-process GraphQL Ralph orchestrator (no child CLI). See `tools/workflows/README.md` § Worktree + BullMQ workflow. Docker, worker cwd, and compose follow-ups: investigation plan `677b6849-1912-4fa8-a5f6-d8233f2cdf97`.
- **Commit as you go:** When running Ralph (or working with OT plans/tasks), commit and push after each task or logical chunk. Use conventional commits and include `Plan-Id` and `Task-Id` in the commit body or footer. Link commits in OT only after the PR is merged (via `workflow-link-merge`); see `databases/README.md` § Commit links.

## Code style and preferences

- **Location:** [.cursor/rules/](.cursor/rules/) — code-writing preferences and style guide. See [.cursor/rules/README.md](.cursor/rules/README.md). Use `coding/` for TypeScript/JS and structure; use `commands/` for OpenThrottle (OT), GitHub, and agent behavior.
- **Agent behavior (plans in OT only; fail loudly):** See [.cursor/rules/README.md](.cursor/rules/README.md) § Agent behavior. That section is the single place for “plans in OpenThrottle only; fail loudly when unavailable”; Cursor and other tooling should follow it.

- **Package READMEs:** For `packages/**/README.md`, list **pnpm** first in install sections and use **`pnpm nx run <project>:<target>`** in Nx examples. Templates live under `tools/generators/src/generators/package/files/`; conventions are summarized in [CONTRIBUTING.md](./CONTRIBUTING.md) and [.cursor/rules/personal-generators.mdc](.cursor/rules/personal-generators.mdc).
- **Knip (dead code):** Run **`pnpm nx run monorepo:knip`** for reports only. Do **not** run `knip --fix` or `knip --fix-type exports` on application UI—it strips intentional `export` on component prop types. Optional `knip --fix-type dependencies` only after human review. See [docs/monorepo/Knip.md](docs/monorepo/Knip.md). CI gate priorities and owners: [docs/monorepo/CI-quality-gates.md](docs/monorepo/CI-quality-gates.md).

## OpenThrottle (OT) — plans knowledge base

- **OpenThrottle (OT)** is the plans/tasks knowledge base (semantic search over the OpenThrottle Postgres database). The MCP that talks to it is **@openthrottle/mcp-developer** (GraphQL only; see `.cursor/mcp.json`). Use the **mcp-developer** MCP server for all OT tools.
- **Local verification:** Minimal server + developer-app flow: [docs/openthrottle/run-openthrottle-server-developer.md](docs/openthrottle/run-openthrottle-server-developer.md). MCP env, smoke checks, secondary workspace: [packages/mcp-developer/docs/verification-environment.md](packages/mcp-developer/docs/verification-environment.md).
- **First-time onboarding (after MCP + server work):** Guided mental model, prerequisites checklist, and a minimal copy-paste prompt sequence — [docs/openthrottle/first-time-onboarding.md](docs/openthrottle/first-time-onboarding.md).
- **Rules:** [.cursor/rules/commands/openthrottle.mdc](.cursor/rules/commands/openthrottle.mdc) — when to use which OT MCP tool ("ask OT", status queries, semantic search, list sources).
- **Commands:** [.cursor/commands/ot/](.cursor/commands/ot/) — `/ot/ask`, `/ot/create-plan`, `/ot/edit-task`, `/ot/list-by-status`, `/ot/list-sources`, `/ot/pending`, `/ot/planning-mode`.
- For "ask OpenThrottle …" or "ask OT …" or "OT, …", follow the OT rule and use the **mcp-developer** MCP server; answer only from retrieved chunks.
- **PRD summarization:** Plans and tasks have an optional `summary` field. Fill it at completion or when closing work with next actions, usage guides, or (for tasks) why blocked. See `databases/README.md` § PRD summarization.

### Plans in OT only; fail loudly

- **Plans and tasks MUST be created in OpenThrottle** via the OT MCP (`create_plan`, `create_task`). Do **not** create plans in Markdown files or under `docs/`.
- **If the OT MCP is unavailable or plan creation fails:** Report the error clearly to the user. Do **not** silently fall back to writing a plan to a `.md` file or skipping. Fail loudly so the user can fix the environment or connectivity.

## Local embeddings (Ollama)

- For local-only embedding (no OpenAI key): set **`OLLAMA_BASE_URL`** and/or **`OLLAMA_EMBEDDING_MODEL`**; `pnpm run database:import` / `pnpm run database:import-docs` and openthrottle-server then use Ollama when configured. See `databases/README.md` (embedding dimension strategy) and `scripts/ollama.sh`.
- **Cursor with a custom Ollama model:** start the proxy with **`pnpm ollama-proxy`** (requires Ollama and optionally Caddy at `https://ollama.local`). See [docs/monorepo/Ollama.md](docs/monorepo/Ollama.md) § Using Cursor with Ollama via the proxy and [tools/ollama-proxy/README.md](tools/ollama-proxy/README.md).
- **When using Caddy** (tools/caddy): set **`OLLAMA_BASE_URL`** to the Caddy-proxied URL so `database:import`, `database:import-docs`, and other consumers use one stable endpoint:
  - **Option B** (local domains): `https://ollama.local`
  - **Option A** (path-based): `https://localhost/ollama`
    See root `.env.default` and `docs/monorepo/Ollama.md`. For HTTPS with Caddy's local certs, trust Caddy's CA (or see tools/caddy/README.md) so Node/fetch and browsers do not hit certificate errors.
