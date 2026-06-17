# Cortex metadata: data sources inventory

Inventory of embeddings, plan/task content, docs, and commit_links — gaps and overlap. See plan: "Brainstorm: metadata for Vector Search + Markdown + PRD + GitHub commits" (Plan-Id: 1240a719-e43c-4845-817f-4852e1af5c29).

## 1. Vector search (embeddings)

| Source | Table                      | Content                                     | Embedding model | MCP / consumer                           |
| ------ | -------------------------- | ------------------------------------------- | --------------- | ---------------------------------------- |
| Plans  | `plan_embeddings`          | Plan title, description, summary, output md | vector(1536)    | openthrottle-mcp `semantic_search`       |
| Tasks  | `task_embeddings`          | Task title, description, summary            | vector(1536)    | openthrottle-mcp `semantic_search`       |
| Docs   | `documentation_embeddings` | Chunked content from `docs/` + NX READMEs   | vector(1536)    | openthrottle-mcp `semantic_search` / `get_document` |

**Ingest:** `cortex:import` (plans); `cortex:import-docs` (docs). Embeddings require `OPENAI_API_KEY` or `OLLAMA_*` (Ollama must output 1536 dimensions; see `databases/README.md` § Embedding dimension strategy).

**Gap:** `semantic_search` does not yet rank across plans + tasks + docs + commits in one query (all served by openthrottle-mcp; the former standalone `docs-mcp` is retired — see [mcp-registration.md § Current state](./mcp-registration.md#current-state)).

---

## 2. Plan / task content (PRD)

| Source        | Table                | Fields                                                                                                             | Notes                                           |
| ------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Plans         | `plans`              | id, title, author, category, status, description, summary, assignee, created_at, updated_at                        | DB is source of truth; no `plans/` JSON on disk |
| Tasks         | `tasks`              | id, plan_id, title, description, category, status, requirements (JSONB), summary, assignee, created_at, updated_at | Same                                            |
| Output stream | `plan_output_stream` | plan_id, iteration, content, created_at                                                                            | Agent iteration log; not embeddings             |

**Ingest:** Plans/tasks created via openthrottle-mcp (`create_plan`, `create_task`) or migrated from `plans/` via `cortex:import`. No file-based PRD source anymore.

**Gap:** No explicit "PRD" table — plan/task content _is_ the PRD. Summary field supports PRD wrap-up; requirements is JSONB for ad-hoc structure.

---

## 3. Markdown (documentation)

| Source     | Table           | Content                       | Path pattern                        |
| ---------- | --------------- | ----------------------------- | ----------------------------------- |
| Docs       | `documentation` | Full text or summary per file | `docs/foo.md`                       |
| NX READMEs | `documentation` | Same                          | `projects/<project-root>/README.md` |

**Metadata:** `repo`, `sha`, `pr_number`, `authors` (JSONB), `message` — mirrors commit/PR context. Idempotent per `(repo, sha, path)`.

**Ingest:** `cortex:import-docs`. Chunks → `documentation_embeddings` for semantic search.

**Overlap:** `documentation` and `documentation_embeddings` form a doc-only vector search path; not linked to plans/tasks/commits.

---

## 4. GitHub commits (`commit_links`)

| Source         | Table          | Fields                                                      | Notes                              |
| -------------- | -------------- | ----------------------------------------------------------- | ---------------------------------- |
| Squash commits | `commit_links` | plan_id, task_id (nullable), repo, sha, message, created_at | Option A: link only after PR merge |

**Ingest:** MCP `link_commit` or `workflow-link-merge` after merge. One row per (plan, task, repo, sha).

**Consumers:** `get_activity_by_date`, `get_last_activity` (openthrottle-mcp); activity resolver (openthrottle-server GraphQL).

**Gap:** `commit_links` has no embedding; not searchable by meaning. Activity is by date/task/plan, not semantic.

---

## 5. Overlap and gaps (summary)

| Dimension                     | Plans/tasks                             | Docs                                              | Commits                               |
| ----------------------------- | --------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| Vector search                 | ✓ plan_embeddings, task_embeddings      | ✓ documentation_embeddings                        | ✗ none                                |
| Metadata (repo, sha, authors) | ✗ plans/tasks have author/assignee only | ✓ documentation has repo, sha, pr_number, authors | ✓ commit_links has repo, sha, message |
| Activity by date              | ✓ plan_output_stream, task updated_at   | ✗ docs not in activity                            | ✓ commit_links                        |
| Cross-source search           | ✗ separate MCPs                         | ✗                                                 | ✗                                     |

**Main gaps:**

1. **No cross-source semantic search** — plans, tasks, docs, and commits are queried separately within openthrottle-mcp. A unified "story over time" query would need to join or rank across those source types in one call.
2. **Inconsistent metadata** — `documentation` and `commit_links` both carry repo/sha; plans/tasks have author/assignee but no repo/sha. No single metadata model that ties all four.
3. **Docs not in activity** — `get_activity_by_date` returns commits, plan output, tasks updated; docs changes are not included.
4. **Commit content not searchable** — commit messages are in `commit_links.message` but not embedded; cannot semantically search "commits about X".

---

## 6. References

- Schema: `databases/README.md`
- OT MCP tools: `.cursor/rules/commands/openthrottle.mdc`
- Ingest: `scripts/openthrottle-ingest-docs.ts` (see root `package.json` scripts `database:import`, `database:import-docs`)
- Activity: `packages/openthrottle-mcp/src/tools/activity.ts`, `applications/openthrottle-server/src/graphql/activity/`
