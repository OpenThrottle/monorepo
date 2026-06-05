# Cortex naming audit: docs and Cursor/VSCode config

**Plan:** Audit all cortex naming references for future rename and relocation
**Task:** Audit docs and Cursor/VSCode config for cortex
**Scope:** List every doc, rule, command, and config that uses or references "cortex". Audit only—no renames.

**Canonical paths today:** Use `.cursor/rules/commands/openthrottle.mdc` and `.cursor/skills/ot-*` (see `/ot/*` skills). The inventory below is a **historical snapshot** of Cortex-era paths and names.

---

## 1. `docs/openthrottle/*` (directory and files)

| Path                                                         | Notes                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| `docs/openthrottle/`                                         | Directory name; holds all cortex-themed docs.                 |
| `docs/openthrottle/audit-env-and-settings.md`                | Audit doc: env vars and settings (from env/settings task).    |
| `docs/openthrottle/audit-scripts.md`                         | Audit doc: scripts (from scripts task).                       |
| `docs/openthrottle/audit-docs-and-cursor-vscode.md`          | This file (docs + Cursor/VSCode audit).                       |
| `docs/openthrottle/brand-palette.md`                         | Design/brand (may use "Cortex" as product name).              |
| `docs/openthrottle/features.md`                              | Product features.                                             |
| `docs/openthrottle/gray-mapping.md`                          | Design.                                                       |
| `docs/openthrottle/metadata-data-sources-inventory.md`       | Metadata inventory.                                           |
| `docs/openthrottle/metadata-model-minimal.md`                | Metadata model.                                               |
| `docs/openthrottle/primer-typography-borders.md`             | Design.                                                       |
| `docs/openthrottle/story-over-time-surfacing.md`             | Product/story.                                                |
| `docs/openthrottle/styles.md`                                | Design.                                                       |
| `docs/openthrottle/vscode-cursor-extension-compatibility.md` | Extension compatibility (likely references Cortex extension). |

For a rename/relocation: the folder `docs/openthrottle/` would become e.g. `docs/vectorkit/` or similar; each file that uses the word "Cortex" in prose would need copy updates.

---

## 2. Docs outside `docs/openthrottle/` that mention cortex

### 2.1 Workflows and Ralph

| Doc                                                   | Cortex references                                                                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/workflows/README.md`                           | Cortex plan/task UUID, `POSTGRES_*`, `databases/README.md`, commit links, Ralph flow, `cortex-ralph`, streamToCortex, plan_output_stream. |
| `tools/workflows/docs/process-model.md`               | Cortex checks, Cortex `plan_output_stream`, streaming to API or Cortex.                                                                   |
| `tools/workflows/docs/server-and-task-metrics.md`     | Cortex DB, Cortex `plan_output_stream`.                                                                                                   |
| `tools/workflows/docs/verification-and-reporting.md`  | Reporting to Cortex (append_plan_output, run summary).                                                                                    |
| `tools/workflows/docs/process-management-proposal.md` | API or Cortex progress.                                                                                                                   |

### 2.2 Monorepo (local services, naming, migration)

| Doc                                                                     | Cortex references                                                                                                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/monorepo/local-services-and-ports.md`                             | openthrottle-server "Cortex tooling", Ollama + `cortex:import`, Postgres (Cortex), cortex-api URL, `cortex.apiBaseUrl`, Caddy plan (Cortex), `databases/README.md`. |
| `docs/monorepo/Ollama.md`                                               | `databases/README.md`, `cortex:import`, AGENTS.md.                                                                                                                  |
| `docs/monorepo/naming-round-3-candidates.md`                            | "ex-Cortex" (plans/knowledge base), naming plan.                                                                                                                    |
| `docs/monorepo/naming-round-2-candidates.md`                            | "ex-Cortex", VectorKit (ex-Cortex).                                                                                                                                 |
| `docs/monorepo/naming-plans-candidates.md`                              | "ex-Cortex", Cortex plan.                                                                                                                                           |
| `docs/monorepo/naming-final-convention-and-choices.md`                  | ex-Cortex, VectorKit, rename "Cortex" to VectorKit.                                                                                                                 |
| `docs/monorepo/naming-criteria-and-availability.md`                     | ex-Cortex, plans/knowledge base naming.                                                                                                                             |
| `docs/monorepo/naming-cms-candidates.md`                                | Cortex plan.                                                                                                                                                        |
| `docs/monorepo/naming-availability-results.md`                          | ex-Cortex, VectorKit.                                                                                                                                               |
| `docs/__archive/monorepo/multi-repo-and-parent-workspace.md` (archived) | "cortex", "cortex-api" as private app names.                                                                                                                        |
| `docs/monorepo/migration-strategy-sql-vs-typeorm.md`                    | Cortex setup, `cortex:migrate`, `run-cortex-migrations.ts`, `databases/README.md`.                                                                                  |

### 2.3 OpenThrottle

| Doc                                                              | Cortex references                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `docs/openthrottle/license-key-docker-machine-identification.md` | Cortex Plan-Id.                                                  |
| `docs/openthrottle/notifications-websockets-plan.md`             | "Plan lives in Cortex", Cortex plan ID, Cortex task IDs.         |
| `docs/openthrottle/vscode-openthrottle-naming.md`                | Cortex plan ID; rebrand: "Cortex" → "OpenThrottle" in extension. |
| `docs/openthrottle/packages-naming.md`                           | Cortex plan; packages/cortex/_, @cortex/_; rebrand steps.        |
| `docs/openthrottle/naming-matrix.md`                             | Cortex plan ID.                                                  |
| `docs/openthrottle/naming-criteria.md`                           | Rebrand from Cortex; avoid "Cortex" for OpenThrottle.            |
| `docs/openthrottle/marketing-website-naming.md`                  | Cortex plan ID.                                                  |
| `docs/openthrottle/developer-portal-naming.md`                   | Cortex plan ID.                                                  |
| `docs/openthrottle/developer-api-naming.md`                      | Cortex plan ID.                                                  |

### 2.4 Tools

| Doc                                   | Cortex references                                          |
| ------------------------------------- | ---------------------------------------------------------- |
| `docs/tools/templates/AGENT_USAGE.md` | Example `--destination=@openthrottle/nestjs-repositories`. |

---

## 3. `.cursor/rules` and `.cursor/commands` (Cortex)

### 3.1 Rules

| File                                | Cortex references                                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/rules/commands/cortex.mdc` | **Full rule for Cortex:** product name "Cortex", ai-mcp, "ask cortex", `/cortex/*`, `databases/README.md`, GITHUB_USER, commit/task workflow. |
| `.cursor/rules/commands/agents.mdc` | "Plans in Cortex only", cortex.mdc, Cortex/ai-mcp.                                                                                            |
| `.cursor/rules/README.md`           | "When to use Cortex", "Plans in Cortex only", cortex.mdc, agents.mdc.                                                                         |

### 3.2 Commands (directory and files)

| Path                                        | Cortex references                                                                                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/commands/cortex/`                  | **Directory name** — would change for rename (e.g. `/vectorkit/*` or keep path and only change prose).                                                               |
| `.cursor/commands/cortex/README.md`         | Title "Cortex Cursor commands", cortex.mdc, "Cortex (semantic search...)", `databases/README.md`.                                                                    |
| `.cursor/commands/cortex/ask.md`            | "Cortex (ai-mcp)", cortex.mdc.                                                                                                                                       |
| `.cursor/commands/cortex/create-plan.md`    | "Cortex", cortex.mdc.                                                                                                                                                |
| `.cursor/commands/cortex/edit-task.md`      | "Cortex", cortex.mdc.                                                                                                                                                |
| `.cursor/commands/cortex/list-by-status.md` | "Cortex", cortex.mdc.                                                                                                                                                |
| `.cursor/commands/cortex/list-sources.md`   | "Cortex plans knowledge base", cortex.mdc.                                                                                                                           |
| `.cursor/commands/cortex/pending.md`        | "Cortex", cortex.mdc.                                                                                                                                                |
| `.cursor/commands/cortex/planning-mode.md`  | "Cortex (ai-mcp)", cortex.mdc.                                                                                                                                       |
| `.cursor/commands/agents/ralph.md`          | Cortex plan/tasks, `/cortex/planning-mode`, plan_output_stream, Cortex MCP, `databases/README.md`, update-cortex-task-status, update-cortex-plan-status, cortex.mdc. |

For rename: rule file could stay `cortex.mdc` or be renamed; command **paths** (`/cortex/ask` etc.) are part of Cursor UX—changing them would require updating all references and user muscle memory. Prose in each file would change from "Cortex" to the new product name.

---

## 4. `.cursor/settings.json` and `.cursor/mcp.json`

| File                    | Key / value                                                                                 | Notes                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/settings.json` | `cortex.apiBaseUrl`: `"http://localhost:6010"`                                              | Cursor-specific; API base for plans/GraphQL. Rename would imply a new key (e.g. `vectorkit.apiBaseUrl` or keep key for backward compat). |
| `.cursor/mcp.json`      | `ai-mcp` description: "Cortex plans knowledge base (semantic search over Cortex Postgres)." | Human-readable only.                                                                                                                     |
| `.cursor/mcp.json`      | `docs-mcp` description: "...ingested into Cortex."                                          | Human-readable only.                                                                                                                     |

---

## 5. `.vscode/` (extensions and settings)

| File                            | Cortex references                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `.vscode/extensions.json`       | Recommendation: `"undefined_publisher.cortex-vscode-openthrottle"` — extension ID; would change when extension is republished under new ID. |
| `.vscode/settings.json.default` | `cortex.apiBaseUrl`: `"http://localhost:6010"`                                                                                              | Template for workspace settings. |

No `.vscode/settings.json` in repo (user-local); template is `settings.json.default`.

---

## 6. Root-level docs: AGENTS.md, README.md

| File        | Cortex references                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` | workflow-ralph cortex-plan-uuid, Cortex, Plan-Id/Task-Id, commit links, `databases/README.md`, "plans in Cortex only", cortex.mdc, `.cursor/commands/cortex/`, docs-mcp "Cortex documentation", `pnpm run cortex:import`, OLLAMA + cortex:import. |
| `README.md` | "Cortex Postgres (plans ingestion, pgvector)", `databases/README.md`, `.env.default` CORTEX*POSTGRES*\*, `docker compose ... up -d cortex`.                                                                                                       |

---

## 7. Summary for strategy doc

- **docs/openthrottle/** — 12+ files; directory name and in-file "Cortex" prose.
- **Other docs** — ~20+ files across `docs/monorepo`, `docs/openthrottle`, `tools/workflows/docs`, `docs/tools` with "cortex" in script names, env names, plan IDs, product name "Cortex", or path references like `databases/README.md`.
- **.cursor/rules** — `cortex.mdc`, `agents.mdc`, `README.md`; "Cortex" and "Plans in Cortex only" throughout.
- **.cursor/commands** — Directory `.cursor/commands/cortex/` and 8 command files + README; all reference Cortex and cortex.mdc.
- **.cursor/settings.json** — Single key `cortex.apiBaseUrl`.
- **.cursor/mcp.json** — Descriptions for ai-mcp and docs-mcp mention "Cortex".
- **.vscode** — `extensions.json` recommends `cortex-vscode-openthrottle`; `settings.json.default` has `cortex.apiBaseUrl`.
- **AGENTS.md / README.md** — Multiple references to Cortex, cortex:\*, databases/cortex, and Cursor commands.

For a future rename/relocation strategy: decide (1) whether Cursor command **paths** stay `/cortex/*` for compatibility or change (e.g. `/plans/*` or new product slug), (2) whether settings keys stay `cortex.*` or migrate to new prefix, (3) order of doc updates vs code/config renames so cross-references stay consistent.
