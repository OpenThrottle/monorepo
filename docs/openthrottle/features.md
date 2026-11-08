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
- **Detailed docs:** [databases/README.md](../../databases/README.md) (schema, plans/tasks tables, Plan and task attributes), [`skills/ot-plans/SKILL.md`](../../skills/ot-plans/SKILL.md) (MCP tools: `get_plan`, `create_plan`, `get_tasks_by_plan_id`, `get_remaining_tasks_for_plan`, `list_tasks_by_category`, `create_task`, `update_task`; optional `project`/`projectId` on `list_plans_by_status`).

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
- **Detailed docs:** [`skills/ot-plans/SKILL.md`](../../skills/ot-plans/SKILL.md), `skills/ot-*`.

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

### Running and scheduling a plan

The **Run** control on Plan Details is a split button. It lives in the plan toolbar, which (with the Configuration tab) is behind `FEATURE_BETA_PREVIEW` for now. The caret menu holds the other ways to start (or stop) a run:

- **Run plan** (primary, one click) enqueues a run now with the plan's saved run configuration.
- **Run with options…** opens the Run dialog on its _Run now_ tab; **Schedule…** opens it on _Schedule_ (a date and time picked and shown in your browser's local zone, with a "fires 3:00 PM PST, in about 3 hours" summary).
- **Cancel scheduled run** appears while a run is scheduled and asks for confirmation. The run-history table also has a **Cancel** action on a `Scheduled` row.

**What the dialog changes.** Model and effort are **plan settings**: choosing them saves them to the plan's run configuration, so later one-click runs use them too (effort is disabled on backends with no separate effort knob, such as cursor, where it is part of the model id). Iterations is **this run only**: it resets to the plan's configured value every time the dialog opens and is never saved. Branch and checkout are shown read-only and come from the Configuration tab; Run is blocked while the branch is blank.

**How a scheduled run behaves.**

- A scheduled run is a `plan_runs` row with status `SCHEDULED` and a delayed BullMQ job. Its run configuration is **frozen when you schedule it**. Scheduling moves the plan to the **`SCHEDULED`** status (shown to everyone, with the fire time in the badge's tooltip) and leaves the tasks alone; the plan and its runnable tasks move to `QUEUED` when the run fires.
- **Only `PENDING` and `BACKLOG` plans can be scheduled, once.** A plan has at most one scheduled run. Scheduling a `QUEUED`/`IN_PROGRESS` plan is refused (`PLAN_ACTIVE`), as is a `BLOCKED` or finished one (`PLAN_NOT_SCHEDULABLE`); scheduling a plan that already has a run waiting is `PLAN_ALREADY_SCHEDULED` unless you reschedule.
- `scheduledFor` must be strictly in the future and **at most 30 days** ahead (`SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS`); the dialog and the server both reject anything else.
- **Changing your mind.** _Schedule…_ becomes _Reschedule…_ and replaces the waiting run. Running now while a run is scheduled asks you to confirm unscheduling it first. Changing the plan's status (Mark Complete included) also cancels the scheduled run, after a confirmation; so does the plan's last task completing. Cancelling the scheduled run, or the run settling `MISSED` or `SUPERSEDED`, returns the plan to `PENDING`.
- **1-hour grace window.** If the run cannot start until it is an hour or more past its time (for example the server was down), it settles `MISSED` and you get a warning notification instead of a surprise late run.
- **Collision hold.** If the plan already has an active run when the scheduled one is due, the scheduled run settles `SUPERSEDED` (with a warning) rather than double-running the plan. A scheduled run on a plan with no task left to run settles `COMPLETED` with an info notification.
- **Restarts.** On boot the plans worker re-creates any delayed job missing from Redis (flushed or recreated volume) with the time still left, or settles the run `MISSED` if it is already past the grace window. Only the instance that owns the repeatable jobs does this.

**GraphQL.** `schedulePlanRun(input: SchedulePlanRunInput!)` takes everything `enqueuePlanRun` takes (`planId`, a required `branch`, `ralph` tuning with `backend`/`model`/`effort`/`iterations`, optional `checkoutId`, `idempotencyKey`, ...) plus a required `scheduledFor` ISO-8601 instant and an optional `replaceScheduled` (reschedule), and returns `planRunId`, `jobId`, `scheduledFor`, `executionBackend` and `planId`. `enqueuePlanRun` and `enqueuePlanRalphOrchestrator` take an optional `cancelScheduled` to run a scheduled plan now. Refusals are GraphQL errors with `extensions.code` `PLAN_ALREADY_SCHEDULED`, `PLAN_ACTIVE` or `PLAN_NOT_SCHEDULABLE`, plus the waiting run's `planRunId` and `scheduledFor`. Cancel with `cancelPlanRun(input: { planId, planRunId })`: with `planRunId` it cancels only that `SCHEDULED` run (delayed job removed, row `CANCELLED`), returns a `SCHEDULED` plan to `PENDING`, and leaves any live run and the tasks alone. It is idempotent: a `planRunId` that has already fired or settled is a no-op, and one that is `QUEUED` or `IN_PROGRESS` is rejected. Omit `planRunId` to cancel the whole plan's queued and scheduled runs and stop a live one. Plan objects expose `scheduledRunAt` and `scheduledRunId` for the soonest waiting run.

- **Detailed docs:** [databases/README.md](../../databases/README.md) (`plan_runs.scheduled_for` and the `SCHEDULED` / `MISSED` / `SUPERSEDED` statuses), [plan-run-worktrees.md](./plan-run-worktrees.md) (where a run executes).

### Background jobs (optional)

- **Run plan** enqueues a plan in BullMQ (status → queued, then in_progress when the worker runs). **Daily stats** for dashboard/analytics.
- **Detailed docs:** [databases/README.md](../../databases/README.md) (queued status, doc tables).

### Evals (preview)

- **Run transcripts for every agent.** Each plan-run iteration, whichever of the seven supported CLIs ran it, is recorded as an open ATIF trajectory: its steps, tool calls, tokens, cost and outcome. So is each OpenThrottle task worked in an interactive Claude Code session. The trajectories are the raw material for evals: datasets built from real failures, graders calibrated against human labels, and paired comparisons between models, drivers and prompts.
- **Behind `FEATURE_DELTA_PREVIEW`** (default `false`, developer app `.env`). The flag gates the eval UI only. Capture is always on, so data has accumulated by the time the flag is turned on. Interactive-session uploads can be turned off with `OPENTHROTTLE_SESSION_TRAJECTORIES=0`.
- **Detailed docs:** [eval-system-adr.md](./eval-system-adr.md) (design of record and decisions).

---

## For landing pages and marketing

- Use the **Features** section headings (e.g. "Plans and tasks", "Ralph (agentic execution)") and their first-line descriptions as hero/feature copy.
- Link “Learn more” or “Details” to the **Detailed docs** listed under each feature.
- Keep this file updated when we add or change product capabilities so the landing page and docs stay in sync.
