# OpenThrottle naming audit: docs and Cursor/VSCode config

**Plan:** Audit all openthrottle naming references for future rename and relocation
**Task:** Audit docs and Cursor/VSCode config for openthrottle
**Scope:** List every doc, rule, command, and config that uses or references "openthrottle". Audit only—no renames.

**Canonical paths today:** Use `.cursor/rules/commands/openthrottle.mdc` and `.cursor/skills/ot-*` (see `/ot/*` skills). The inventory below is a **historical snapshot** of OpenThrottle paths and names.

---

## 1. `docs/openthrottle/*` (directory and files)

| Path                                                         | Notes                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `docs/openthrottle/`                                         | Directory name; holds all openthrottle-themed docs.                 |
| `docs/openthrottle/audit-env-and-settings.md`                | Audit doc: env vars and settings (from env/settings task).          |
| `docs/openthrottle/audit-scripts.md`                         | Audit doc: scripts (from scripts task).                             |
| `docs/openthrottle/audit-docs-and-cursor-vscode.md`          | This file (docs + Cursor/VSCode audit).                             |
| `docs/openthrottle/brand-palette.md`                         | Design/brand (may use "OpenThrottle" as product name).              |
| `docs/openthrottle/features.md`                              | Product features.                                                   |
| `docs/openthrottle/gray-mapping.md`                          | Design.                                                             |
| `docs/openthrottle/metadata-data-sources-inventory.md`       | Metadata inventory.                                                 |
| `docs/openthrottle/metadata-model-minimal.md`                | Metadata model.                                                     |
| `docs/openthrottle/primer-typography-borders.md`             | Design.                                                             |
| `docs/openthrottle/story-over-time-surfacing.md`             | Product/story.                                                      |
| `docs/openthrottle/styles.md`                                | Design.                                                             |
| `docs/openthrottle/vscode-cursor-extension-compatibility.md` | Extension compatibility (likely references OpenThrottle extension). |

For a rename/relocation: the folder `docs/openthrottle/` would become e.g. `docs/vectorkit/` or similar; each file that uses the word "OpenThrottle" in prose would need copy updates.

---

## 2. Docs outside `docs/openthrottle/` that mention openthrottle

### 2.1 Workflows and Ralph

| Doc                                                   | OpenThrottle references                                                                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/workflows/README.md`                           | OpenThrottle plan/task UUID, `POSTGRES_*`, `databases/README.md`, commit links, Ralph flow, `openthrottle-ralph`, streamToOpenThrottle, plan_output_stream. |
| `tools/workflows/docs/process-model.md`               | OpenThrottle checks, OpenThrottle `plan_output_stream`, streaming to API or OpenThrottle.                                                                   |
| `tools/workflows/docs/server-and-task-metrics.md`     | OpenThrottle DB, OpenThrottle `plan_output_stream`.                                                                                                         |
| `tools/workflows/docs/verification-and-reporting.md`  | Reporting to OpenThrottle (append_plan_output, run summary).                                                                                                |
| `tools/workflows/docs/process-management-proposal.md` | API or OpenThrottle progress.                                                                                                                               |

### 2.2 Monorepo (local services, naming, migration)

| Doc                                                                     | OpenThrottle references                                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/monorepo/local-services-and-ports.md`                             | openthrottle-server "OpenThrottle tooling", Ollama + `openthrottle:import`, Postgres (OpenThrottle), openthrottle-api URL, `openthrottle.apiBaseUrl`, Caddy plan (OpenThrottle), `databases/README.md`. |
| `docs/monorepo/Ollama.md`                                               | `databases/README.md`, `openthrottle:import`, AGENTS.md.                                                                                                                                                |
| `docs/monorepo/naming-round-3-candidates.md`                            | "OpenThrottle" (plans/knowledge base), naming plan.                                                                                                                                                     |
| `docs/monorepo/naming-round-2-candidates.md`                            | "OpenThrottle", VectorKit (OpenThrottle).                                                                                                                                                               |
| `docs/monorepo/naming-plans-candidates.md`                              | "OpenThrottle", OpenThrottle plan.                                                                                                                                                                      |
| `docs/monorepo/naming-final-convention-and-choices.md`                  | OpenThrottle, VectorKit, rename "OpenThrottle" to VectorKit.                                                                                                                                            |
| `docs/monorepo/naming-criteria-and-availability.md`                     | OpenThrottle, plans/knowledge base naming.                                                                                                                                                              |
| `docs/monorepo/naming-cms-candidates.md`                                | OpenThrottle plan.                                                                                                                                                                                      |
| `docs/monorepo/naming-availability-results.md`                          | OpenThrottle, VectorKit.                                                                                                                                                                                |
| `docs/__archive/monorepo/multi-repo-and-parent-workspace.md` (archived) | "openthrottle", "openthrottle-api" as private app names.                                                                                                                                                |
| `docs/monorepo/migration-strategy-sql-vs-typeorm.md`                    | OpenThrottle setup, `openthrottle:migrate`, `run-openthrottle-migrations.ts`, `databases/README.md`.                                                                                                    |

### 2.3 OpenThrottle

| Doc                                                              | OpenThrottle references                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `docs/openthrottle/license-key-docker-machine-identification.md` | OpenThrottle Plan-Id.                                                        |
| `docs/openthrottle/notifications-websockets-plan.md`             | "Plan lives in OpenThrottle", OpenThrottle plan ID, OpenThrottle task IDs.   |
| `docs/openthrottle/vscode-openthrottle-naming.md`                | OpenThrottle plan ID; rebrand: "OpenThrottle" → "OpenThrottle" in extension. |
| `docs/openthrottle/packages-naming.md`                           | OpenThrottle plan; packages/openthrottle/_, @openthrottle/_; rebrand steps.  |
| `docs/openthrottle/naming-matrix.md`                             | OpenThrottle plan ID.                                                        |
| `docs/openthrottle/naming-criteria.md`                           | Rebrand from OpenThrottle; avoid "OpenThrottle" for OpenThrottle.            |
| `docs/openthrottle/marketing-website-naming.md`                  | OpenThrottle plan ID.                                                        |
| `docs/openthrottle/developer-portal-naming.md`                   | OpenThrottle plan ID.                                                        |
| `docs/openthrottle/developer-api-naming.md`                      | OpenThrottle plan ID.                                                        |

### 2.4 Tools

| Doc                                   | OpenThrottle references                                    |
| ------------------------------------- | ---------------------------------------------------------- |
| `docs/tools/templates/AGENT_USAGE.md` | Example `--destination=@openthrottle/nestjs-repositories`. |

---

## 3. `.cursor/rules` and `.cursor/commands` (OpenThrottle)

### 3.1 Rules

| File                                      | OpenThrottle references                                                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/rules/commands/openthrottle.mdc` | **Full rule for OpenThrottle:** product name "OpenThrottle", ai-mcp, "ask openthrottle", `/openthrottle/*`, `databases/README.md`, GITHUB_USER, commit/task workflow. |
| `.cursor/rules/commands/agents.mdc`       | "Plans in OpenThrottle only", openthrottle.mdc, OpenThrottle/ai-mcp.                                                                                                  |
| `.cursor/rules/README.md`                 | "When to use OpenThrottle", "Plans in OpenThrottle only", openthrottle.mdc, agents.mdc.                                                                               |

### 3.2 Commands (directory and files)

| Path                                              | OpenThrottle references                                                                                                                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/commands/openthrottle/`                  | **Directory name** — would change for rename (e.g. `/vectorkit/*` or keep path and only change prose).                                                                                                   |
| `.cursor/commands/openthrottle/README.md`         | Title "OpenThrottle Cursor commands", openthrottle.mdc, "OpenThrottle (semantic search...)", `databases/README.md`.                                                                                      |
| `.cursor/commands/openthrottle/ask.md`            | "OpenThrottle (ai-mcp)", openthrottle.mdc.                                                                                                                                                               |
| `.cursor/commands/openthrottle/create-plan.md`    | "OpenThrottle", openthrottle.mdc.                                                                                                                                                                        |
| `.cursor/commands/openthrottle/edit-task.md`      | "OpenThrottle", openthrottle.mdc.                                                                                                                                                                        |
| `.cursor/commands/openthrottle/list-by-status.md` | "OpenThrottle", openthrottle.mdc.                                                                                                                                                                        |
| `.cursor/commands/openthrottle/list-sources.md`   | "OpenThrottle plans knowledge base", openthrottle.mdc.                                                                                                                                                   |
| `.cursor/commands/openthrottle/pending.md`        | "OpenThrottle", openthrottle.mdc.                                                                                                                                                                        |
| `.cursor/commands/openthrottle/planning-mode.md`  | "OpenThrottle (ai-mcp)", openthrottle.mdc.                                                                                                                                                               |
| `.cursor/commands/agents/ralph.md`                | OpenThrottle plan/tasks, `/openthrottle/planning-mode`, plan_output_stream, OpenThrottle MCP, `databases/README.md`, update-openthrottle-task-status, update-openthrottle-plan-status, openthrottle.mdc. |

For rename: rule file could stay `openthrottle.mdc` or be renamed; command **paths** (`/openthrottle/ask` etc.) are part of Cursor UX—changing them would require updating all references and user muscle memory. Prose in each file would change from "OpenThrottle" to the new product name.

---

## 4. `.cursor/settings.json` and `.cursor/mcp.json`

| File                    | Key / value                                                                                             | Notes                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/settings.json` | `openthrottle.apiBaseUrl`: `"http://localhost:6010"`                                                    | Cursor-specific; API base for plans/GraphQL. Rename would imply a new key (e.g. `vectorkit.apiBaseUrl` or keep key for backward compat). |
| `.cursor/mcp.json`      | `ai-mcp` description: "OpenThrottle plans knowledge base (semantic search over OpenThrottle Postgres)." | Human-readable only.                                                                                                                     |
| `.cursor/mcp.json`      | `docs-mcp` description: "...ingested into OpenThrottle."                                                | Human-readable only.                                                                                                                     |

---

## 5. `.vscode/` (extensions and settings)

| File                            | OpenThrottle references                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `.vscode/extensions.json`       | Recommendation: `"undefined_publisher.openthrottle-vscode-openthrottle"` — extension ID; would change when extension is republished under new ID. |
| `.vscode/settings.json.default` | `openthrottle.apiBaseUrl`: `"http://localhost:6010"`                                                                                              | Template for workspace settings. |

No `.vscode/settings.json` in repo (user-local); template is `settings.json.default`.

---

## 6. Root-level docs: AGENTS.md, README.md

| File        | OpenThrottle references                                                                                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` | workflow-ralph openthrottle-plan-uuid, OpenThrottle, Plan-Id/Task-Id, commit links, `databases/README.md`, "plans in OpenThrottle only", openthrottle.mdc, `.cursor/commands/openthrottle/`, docs-mcp "OpenThrottle documentation", `pnpm run openthrottle:import`, OLLAMA + openthrottle:import. |
| `README.md` | "OpenThrottle Postgres (plans ingestion, pgvector)", `databases/README.md`, `.env.default` OPENTHROTTLE*POSTGRES*\*, `docker compose ... up -d openthrottle`.                                                                                                                                     |

---

## 7. Summary for strategy doc

- **docs/openthrottle/** — 12+ files; directory name and in-file "OpenThrottle" prose.
- **Other docs** — ~20+ files across `docs/monorepo`, `docs/openthrottle`, `tools/workflows/docs`, `docs/tools` with "openthrottle" in script names, env names, plan IDs, product name "OpenThrottle", or path references like `databases/README.md`.
- **.cursor/rules** — `openthrottle.mdc`, `agents.mdc`, `README.md`; "OpenThrottle" and "Plans in OpenThrottle only" throughout.
- **.cursor/commands** — Directory `.cursor/commands/openthrottle/` and 8 command files + README; all reference OpenThrottle and openthrottle.mdc.
- **.cursor/settings.json** — Single key `openthrottle.apiBaseUrl`.
- **.cursor/mcp.json** — Descriptions for ai-mcp and docs-mcp mention "OpenThrottle".
- **.vscode** — `extensions.json` recommends `openthrottle-vscode-openthrottle`; `settings.json.default` has `openthrottle.apiBaseUrl`.
- **AGENTS.md / README.md** — Multiple references to OpenThrottle, openthrottle:\*, databases/openthrottle, and Cursor commands.

For a future rename/relocation strategy: decide (1) whether Cursor command **paths** stay `/openthrottle/*` for compatibility or change (e.g. `/plans/*` or new product slug), (2) whether settings keys stay `openthrottle.*` or migrate to new prefix, (3) order of doc updates vs code/config renames so cross-references stay consistent.
