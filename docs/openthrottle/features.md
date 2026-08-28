# OpenThrottle (OT) — Product features

High-level overview of what OpenThrottle is and what it does. Use this doc as the **source of truth** for landing page copy, feature lists, and “the greatness we are building.” For implementation details, follow the links below.

## What is OpenThrottle (OT)?

OpenThrottle (OT) is a **plans knowledge base**: a Postgres-backed app (and MCP servers) that stores plans, tasks, and semantic search over them and over repo documentation. It powers “ask OT,” agentic execution (Ralph), and a dashboard so you can see what’s in progress and what shipped.

---

## Features

### Plans and tasks

- Create and manage **plans** with **tasks**; track status: **backlog**, blocked, **canceled**, completed, in_progress, pending, **queued** (plans only; Run plan enqueues in BullMQ), skipped.
- Optional **assignee** (GitHub username) and **summary** (PRD wrap-up, next actions) on plans and tasks.
- List plans by status (and optional project filter); list tasks by plan or category; see remaining tasks per plan (`get_remaining_tasks_for_plan`).
- **Detailed docs:** [databases/README.md](../../databases/README.md) (schema, plans/tasks tables, Plan and task attributes), [.cursor/rules/commands/openthrottle.mdc](../../.cursor/rules/commands/openthrottle.mdc) (MCP tools: `get_plan`, `create_plan`, `get_tasks_by_plan_id`, `get_remaining_tasks_for_plan`, `list_tasks_by_category`, `create_task`, `update_task`; optional `project`/`projectId` on `list_plans_by_status`).

### Projects

- Group and filter **plans** (and tasks) by **NX project** (e.g. openthrottle-developer, openthrottle). Optional `project_id` / project on create/update; leave unset for cross-cutting or docs-only work.
- **Detailed docs:** [databases/README.md](../../databases/README.md) (§ Project association (when to set project)).

### Semantic search (plans and tasks)

- **Semantic search** over plans and tasks (pgvector embeddings). Ask questions in natural language and get relevant plan/task content via **openthrottle-mcp** (OT MCP).
- **Detailed docs:** [databases/README.md](../../databases/README.md) (plan_embeddings, task_embeddings, embedding strategy).

### Documentation search

- Ingest **docs/** and NX project READMEs into OpenThrottle; search documentation semantically via **openthrottle-mcp** (`semantic_search`, `list_sources`, `get_document`) alongside plans and tasks. (The former standalone `docs-mcp` server is retired; its role folded into `openthrottle-mcp` — see [mcp-registration.md § Current state](./mcp-registration.md#current-state).)
- **Detailed docs:** [databases/README.md](../../databases/README.md) (documentation, documentation_embeddings, ingest).

### Activity and commit links

- **Activity by date:** see what was worked on or shipped on a given day or in the last N days (commits, plan output, task updates).
- **Commit links:** associate a git commit (e.g. squash after PR merge) with a plan and optional task; activity tools use this for “what landed.”
- **Detailed docs:** [databases/README.md](../../databases/README.md) (commit_links, Option A workflow, get_activity_by_date, get_last_activity).

### Ralph (agentic execution)

- Turn an idea or PRD into a **plan + tasks in OT**, then **execute one task at a time** until done. Progress lives in OT (plan, tasks, plan_output_stream); commit with Plan-Id and Task-Id; link the squash commit after PR merge.
- **Detailed docs:** [docs/workflows/ralph-design.md](../workflows/ralph-design.md), [skills/agents-ralph/SKILL.md](../../skills/agents-ralph/SKILL.md), [tools/workflows/README.md](../../tools/workflows/README.md).

### Cursor integration (MCP)

- **openthrottle-mcp** (OT) MCP server in Cursor: ask OpenThrottle / ask OT, list plans by status, create/edit plans and tasks, semantic search, activity by date, output stream, commit links.
- **Detailed docs:** [.agents/rules/commands/openthrottle.mdc](../../.agents/rules/commands/openthrottle.mdc), `skills/ot-*`.

### Dashboard (OpenThrottle app)

- Web app: view plans (all, in progress), plan counts by status, remaining tasks per plan, recent activity, projects. Sign in and work from the browser. API: **openthrottle-server**; UI: **openthrottle-developer**.
- **Detailed docs:** [applications/openthrottle-developer/README.md](../../applications/openthrottle-developer/README.md).

### Notes

- Quick **notes** (unstructured thoughts) with optional author; foundation for planning (e.g. create plan from note). Exposed via MCP.
- **Detailed docs:** [databases/README.md](../../databases/README.md) (notes table, MCP create_note, list_notes, etc.).

### Runs entirely locally on Open Source

**Run entirely locally on Open Source models and software.** The whole stack runs on your machine or your own infrastructure with OSS tooling and OSS models (e.g. Ollama) — no required SaaS or proprietary APIs for core flows, and no vendor lock-in.

| Component                           | Role                                                          | OSS / local                                  |
| ----------------------------------- | ------------------------------------------------------------- | -------------------------------------------- |
| **Postgres** (with pgvector)        | OpenThrottle app DB + OpenThrottle (plans, tasks, embeddings) | OSS, runs locally (Docker or native)         |
| **Redis**                           | Queues, caching                                               | OSS, runs locally                            |
| **OpenThrottle server**             | API, GraphQL, queues, notifications                           | OSS (NestJS), runs locally                   |
| **OpenThrottle developer app**      | Dashboard for plans, queues, PRs                              | OSS (React Router), runs locally             |
| **OpenThrottle / openthrottle-mcp** | Plans knowledge base, semantic search, MCP tools              | OSS, runs locally; connects to same Postgres |
| **Ollama**                          | Local LLM and embedding models                                | OSS, runs locally; optional for embeddings   |

Postgres and Redis are required; **Ollama** is what makes semantic search work with no cloud API at all. **OpenAI** is optional — set `OPENAI_API_KEY` instead if you prefer cloud embeddings.

- **Detailed docs:** [monorepo/Ollama.md](../monorepo/Ollama.md) § Embeddings for OpenThrottle (provider config, dimension caveat, MCP launcher), [databases/README.md](../../databases/README.md) (embedding dimension strategy), [local-quickstart.md](./local-quickstart.md) (fresh clone → running).

### Background jobs (optional)

- **Run plan** enqueues a plan in BullMQ (status → queued, then in_progress when the worker runs). **Doc ingestion** (diff-based re-index of `docs/` on main). **Daily stats** for dashboard/analytics.
- **Detailed docs:** [databases/README.md](../../databases/README.md) (queued status, doc tables).

---

## For landing pages and marketing

- Use the **Features** section headings (e.g. "Plans and tasks", "Ralph (agentic execution)") and their first-line descriptions as hero/feature copy.
- Link “Learn more” or “Details” to the **Detailed docs** listed under each feature.
- Keep this file updated when we add or change product capabilities so the landing page and docs stay in sync.
