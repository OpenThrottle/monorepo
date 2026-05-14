# Audit: docs/openthrottle/features.md vs codebase

Audit date: 2025-02-12. Compare `docs/openthrottle/features.md` to `databases/cortex`, mcp-developer tools, and apps (openthrottle-developer, openthrottle-server) for gaps. Use this list when updating the feature list and links (task: Update feature list and Detailed docs links).

## Gaps and fixes

### 1. Status list incomplete

- **features.md:** Lists "pending, in progress, completed, blocked, skipped."
- **Codebase:** Canonical statuses in schema and README: **backlog**, blocked, **canceled**, completed, in_progress, pending, **queued** (plans only), skipped.
- **Fix:** Update Plans and tasks to list all statuses; note that **queued** is plans-only (BullMQ Run plan).

### 2. Projects (new feature)

- **features.md:** Not mentioned.
- **Codebase:** `projects` table; plans/tasks have `project` (TEXT, NX project name) and `project_id` (FK). MCP: `list_plans_by_status(project?, projectId?)`, create/update plan/task support `project`/`projectId`. openthrottle-server GraphQL has projects resolver; openthrottle-developer has projects UI.
- **Fix:** Add a **Projects** subsection: group plans/tasks by NX project; filter by project in list; optional project on create/update. Link to `databases/README.md` § Project association.

### 3. Assignee and summary

- **features.md:** Not mentioned.
- **Codebase:** Plans and tasks have optional `assignee` (GitHub username) and `summary` (PRD summarization). README § Assignee rule, § PRD summarization.
- **Fix:** Add one line under Plans and tasks: assignee (GitHub username), summary (wrap-up/next actions). Or reference README § Plan and task attributes.

### 4. Documentation search — separate MCP

- **features.md:** Says ingest docs/ and NX READMEs; search semantically; links to cortex README only.
- **Codebase:** Documentation search is exposed via **docs-mcp** (separate from mcp-developer). AGENTS.md and cortex rules say use docs-mcp for docs content, mcp-developer for plans/tasks.
- **Fix:** In Documentation search, state that search is exposed via **docs-mcp** (separate MCP server from mcp-developer). Link to docs-mcp package or README if present.

### 5. Dashboard link broken

- **features.md:** "**Detailed docs:** [applications/cortex/README.md](../../applications/cortex/README.md)."
- **Codebase:** `applications/cortex` does **not** exist. Cortex UI is **openthrottle-developer** (plans, projects, notes; GraphQL from openthrottle-server). See `docs/openthrottle/audit-env-and-settings.md`, `docs/openthrottle/cortex-naming-audit.md`.
- **Fix:** Change Dashboard detailed docs link to `applications/openthrottle-developer/README.md` (and optionally note that the API is openthrottle-server).

### 6. Queues / Run plan (optional)

- **features.md:** Not mentioned.
- **Codebase:** BullMQ: plans queue (Run plan → status QUEUED then in_progress), doc-ingestion job (diff-based docs ingest), daily-stats (e.g. 6am UTC). `docs/openthrottle/doc-ingestion-job-spec.md` for doc ingestion.
- **Fix:** Optionally add a short bullet: background jobs (Run plan via queue, doc ingestion, daily stats); link to README or doc-ingestion-job-spec where relevant.

### 7. Daily stats (optional)

- **features.md:** Not mentioned.
- **Codebase:** `daily_stats` table; one row per day; openthrottle-server DailyStatsProcessor (BullMQ). Used for dashboard/analytics.
- **Fix:** Optionally mention under Dashboard or as one line (e.g. daily stats for plans/tasks counts).

### 8. VS Code / Cursor extension (optional)

- **features.md:** Only "Dashboard (Cortex app)" for web.
- **Codebase:** `packages/openthrottle/vscode-openthrottle` — view plans in IDE, cortex.apiBaseUrl, refresh, create plan from text.
- **Fix:** Optionally add "VS Code / Cursor extension" for viewing plans and tasks in the IDE; link to `packages/openthrottle/vscode-openthrottle` or docs.

### 9. MCP tool list

- **features.md:** Lists get_plan, create_plan, get_tasks_by_plan_id, create_task, update_task. Doesn’t list `list_tasks_by_category`, `get_remaining_tasks_for_plan`, or project filters.
- **Codebase:** mcp-developer exposes list_tasks_by_category; get_remaining_tasks_for_plan; list_plans_by_status(project?, projectId?).
- **Fix:** In Plans and tasks or Cursor integration, add list_tasks_by_category and get_remaining_tasks_for_plan; note optional project/projectId filter on list_plans_by_status (or leave in Detailed docs only).

### 10. Users table

- **Codebase:** `users` table exists (minimal; future auth/assignment). Not a user-facing feature yet.
- **Fix:** No change in features.md unless we add "Users (future)" later.

---

## Summary

- **Must fix:** Status list (add backlog, canceled, queued), **Projects** (new subsection), **Dashboard link** (→ openthrottle-developer).
- **Should fix:** Assignee/summary one-liner; Documentation search → docs-mcp; MCP tool list (list_tasks_by_category, get_remaining_tasks_for_plan, project filters).
- **Optional:** Queues/Run plan, daily stats, VS Code extension.
