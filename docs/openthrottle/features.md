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
- **Detailed docs:** [databases/cortex/README.md](../../databases/cortex/README.md) (schema, plans/tasks tables, Plan and task attributes), [.cursor/rules/commands/cortex.mdc](../../.cursor/rules/commands/cortex.mdc) (MCP tools: `get_plan`, `create_plan`, `get_tasks_by_plan_id`, `get_remaining_tasks_for_plan`, `list_tasks_by_category`, `create_task`, `update_task`; optional `project`/`projectId` on `list_plans_by_status`).

### Projects

- Group and filter **plans** (and tasks) by **NX project** (e.g. openthrottle-developer, cortex). Optional `project_id` / project on create/update; leave unset for cross-cutting or docs-only work.
- **Detailed docs:** [databases/cortex/README.md](../../databases/cortex/README.md) (§ Project association (when to set project)).

### Semantic search (plans and tasks)

- **Semantic search** over plans and tasks (pgvector embeddings). Ask questions in natural language and get relevant plan/task content via **mcp-developer** (OT MCP).
- **Detailed docs:** [databases/cortex/README.md](../../databases/cortex/README.md) (plan_embeddings, task_embeddings, embedding strategy).

### Documentation search

- Ingest **docs/** and NX project READMEs into OpenThrottle; search documentation semantically via the **docs-mcp** MCP server (separate from mcp-developer; use docs-mcp for docs content, mcp-developer for plans/tasks).
- **Detailed docs:** [databases/cortex/README.md](../../databases/cortex/README.md) (documentation, documentation_embeddings, ingest), [packages/docs-mcp/README.md](../../packages/docs-mcp/README.md).

### Activity and commit links

- **Activity by date:** see what was worked on or shipped on a given day or in the last N days (commits, plan output, task updates).
- **Commit links:** associate a git commit (e.g. squash after PR merge) with a plan and optional task; activity tools use this for “what landed.”
- **Detailed docs:** [databases/cortex/README.md](../../databases/cortex/README.md) (commit_links, Option A workflow, get_activity_by_date, get_last_activity).

### Ralph (agentic execution)

- Turn an idea or PRD into a **plan + tasks in OT**, then **execute one task at a time** until done. Progress lives in OT (plan, tasks, plan_output_stream); commit with Plan-Id and Task-Id; link the squash commit after PR merge.
- **Detailed docs:** [docs/workflows/ralph-design.md](../workflows/ralph-design.md), [.cursor/commands/agents/ralph.md](../../.cursor/commands/agents/ralph.md), [tools/workflows/README.md](../../tools/workflows/README.md).

### Cursor integration (MCP)

- **mcp-developer** (OT) MCP server in Cursor: ask OpenThrottle / ask OT, list plans by status, create/edit plans and tasks, semantic search, activity by date, output stream, commit links.
- **Detailed docs:** [.cursor/rules/commands/cortex.mdc](../../.cursor/rules/commands/cortex.mdc), [.cursor/commands/cortex/](../../.cursor/commands/cortex/).

### Dashboard (OpenThrottle app)

- Web app: view plans (all, in progress), plan counts by status, remaining tasks per plan, recent activity, projects. Sign in and work from the browser. API: **openthrottle-server**; UI: **openthrottle-developer**.
- **Detailed docs:** [applications/openthrottle-developer/README.md](../../applications/openthrottle-developer/README.md).

### Notes

- Quick **notes** (unstructured thoughts) with optional author; foundation for planning (e.g. create plan from note). Exposed via MCP.
- **Detailed docs:** [databases/cortex/README.md](../../databases/cortex/README.md) (notes table, MCP create_note, list_notes, etc.).

### Background jobs (optional)

- **Run plan** enqueues a plan in BullMQ (status → queued, then in_progress when the worker runs). **Doc ingestion** (diff-based re-index of `docs/` on main). **Daily stats** for dashboard/analytics.
- **Detailed docs:** [databases/cortex/README.md](../../databases/cortex/README.md) (queued status, doc tables), [docs/openthrottle/doc-ingestion-job-spec.md](doc-ingestion-job-spec.md).

---

## For landing pages and marketing

- Use the **Features** section headings (e.g. "Plans and tasks", "Ralph (agentic execution)") and their first-line descriptions as hero/feature copy.
- Link “Learn more” or “Details” to the **Detailed docs** listed under each feature.
- Keep this file updated when we add or change product capabilities so the landing page and docs stay in sync.
