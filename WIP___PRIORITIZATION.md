# OpenThrottle Cursor skills — prioritization and naming (task 596779c3)

This document resolves overlaps between the Cortex plan’s proposed skills and existing workspace skills (`nx-generate`, `nx-workspace`, `nx-run-tasks`, `git-commit`). Subsequent SKILL drafts should cross-link here until individual SKILL.md files exist.

## Boundaries (do not duplicate)

| Existing skill   | Owns                                                              | OpenThrottle skills must not re-teach                                                                  |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **nx-generate**  | Discover generators, `--dry-run`, prefer local generators, verify | Generic `nx g` steps, library buildable vs non-buildable tables                                        |
| **nx-workspace** | `nx show projects`, resolved config, graph, affected reference    | jq/graph recipes as generic Nx patterns                                                                |
| **nx-run-tasks** | `nx run`, `run-many`, `affected`, flags                           | Same                                                                                                   |
| **git-commit**   | Conventional commits, staging, message shape                      | Commit mechanics; OT skills only add **Plan-Id** / **Task-Id** footers and **when** to commit per task |

## Mapping: plan proposals → consolidated skills

The plan listed eight areas. Below they are merged where overlap would confuse agents or duplicate nx-\* skills.

| #   | Plan area                | Consolidated skill id / folder            | Rationale                                                                                                                                          |
| --- | ------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | OT MCP & traceability    | **`openthrottle-plans`**                  | Single home for openthrottle-mcp, fail-loudly, GitHub issues vs Markdown, post-merge `link_commit` / workflow-link-merge                           |
| 2   | Scaffold-first monorepo  | **`openthrottle-monorepo`**               | Adds `@tools/generators`, `NX_ISOLATE_PLUGINS=false`, `pnpm nx`, `docs/tools/templates/AGENT_USAGE.md`; delegates execution to **nx-generate**     |
| 3   | Tasks & graph            | _(merged into **openthrottle-monorepo**)_ | Prefer **nx affected**, resolve project names via **nx-workspace**, run via **nx-run-tasks** and AGENTS.md — only OT-specific pointers belong here |
| 4   | Ralph & queue            | **`openthrottle-ralph`**                  | `workflow-ralph`, UUIDs, worker vs orchestrator, `tools/workflows/README.md`; unique                                                               |
| 5   | NestJS GraphQL           | **`openthrottle-server`**                 | Resolvers (Paginated/List/Result), deprecation, Nest test patterns in this repo                                                                    |
| 6   | DB, embeddings, imports  | **`openthrottle-data`**                   | `databases/README.md`, ingest scripts, Ollama vs hosted                                                                                            |
| 7   | Remix/React Router UI    | **`openthrottle-developer-ui`**           | App routing under applications, `@openthrottle/react-router-shadcn`, loader/action patterns                                                        |
| 8   | openthrottle-mcp package | **`openthrottle-mcp`**                    | Env/smoke, GraphQL boundary, extending MCP tools — references **openthrottle-plans** for product semantics                                         |

**Split vs merge decisions**

- **Merge 2 + 3** into `openthrottle-monorepo`: one skill avoids two triggers firing for every “how do I run/build this?” question; boundaries stay clear via sections (“Scaffold → nx-generate”, “Graph/targets → nx-workspace / nx-run-tasks”).
- **Keep server/data/UI/MCP separate** (`openthrottle-server`, `openthrottle-data`, `openthrottle-developer-ui`, `openthrottle-mcp`): different triggers (GraphQL vs migrations vs routes vs MCP package) reduce noise; each SKILL stays skimmable.
- **`openthrottle-plans` vs `git-commit`**: split — plans skill owns OT traceability and linking; git-commit stays generic.

## Implementation priority (phased rollout)

1. **`openthrottle-plans`** — Plans/tasks are prerequisites for Ralph and consistent agent behavior.
2. **`openthrottle-monorepo`** — Daily scaffolding and task execution paths.
3. **`openthrottle-ralph`** — Workflow CLI and queue mental model for agent runners.
4. **`openthrottle-server`**, **`openthrottle-data`**, **`openthrottle-developer-ui`**, **`openthrottle-mcp`** — Stack-specific; can ship in one PR as thin SKILL.md files with strong links to canonical docs paths.

## Frontmatter naming

Use Cursor skill **`name`** matching the folder (kebab-case), e.g. `name: openthrottle-plans`. Descriptions should include trigger phrases (“OpenThrottle”, “OT”, “openthrottle-mcp”, “workflow-ralph”, “Cortex plan”) so discovery matches team vocabulary from AGENTS.md.

## Related plan

- Plan-Id: `d7325192-31fb-40af-bd1a-9aaea6e2d91a`
