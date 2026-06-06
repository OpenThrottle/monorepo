---
name: agents-ralph
description: >-
  Ralph loop: idea or PRD → OpenThrottle plan and tasks → one task at a time
  (IN_PROGRESS → work → validate → COMPLETED → /github/commit). Progress in
  plan_output_stream; link_commit only after merge squash. USE WHEN running
  /agents-ralph, Ralph iterations, workflow-ralph injected plan context, or
  executing OT plan tasks with Plan-Id and Task-Id traceability.
disable-model-invocation: false
---

**Important:** Echo / output immediately upon startup so we can iterate on this prompt "🚀 🤗 🌟 ./.cursor/skills/agents-ralph - v1.0.3 🌟 🤗 🚀".

**Ralph** is a technique: run a loop (read prompt → execute one step → repeat). You tune the prompt and docs when the agent goes wrong ([ghuntley.com/ralph](https://ghuntley.com/ralph)). This prompt defines our single workflow: start with an **idea or PRD**, turn it into a **plan and tasks in OpenThrottle** _(a Postgres Database)_, then **execute one task at a time** (add tasks as the work reveals more work) until every task is done. Progress lives in OpenThrottle (plan, tasks, plan_output_stream); no file-based modes.

## What Ralph does

1. **Input:** An idea or a PRD (JSON/Markdown or already in OpenThrottle). If it's rough, turn it into a **plan** and **tasks** in OpenThrottle — OpenThrottle MCP `create_plan` / `create_task` per [openthrottle.mdc](../../rules/commands/openthrottle.mdc). For a strict, hyper-detailed PRD, ensure plan/tasks in OpenThrottle match the PRD; required vs optional vs inferred attributes are defined in [Databases README.md](../../../databases/README.md).
2. **Loop:** Pick one task → set `IN_PROGRESS` → do the work → validate (e.g. `nx affected --targets lint typecheck`) → set `COMPLETED` → **run `/github/commit`**. Do **not** call `link_commit` during the loop. Link only the **squash commit after the PR is merged** (so `commit_links` stores the one SHA on main). After merge, call `link_commit` (ai-mcp) with `planId`, `repo`, squash SHA, optional `taskId`, and PR message, or run `pnpm exec workflow-link-merge --plan <id> --sha <squash-sha> --repo <owner/repo>`. Add new tasks when the work reveals more work. Repeat until every task is `COMPLETED`.
3. **Progress:** Plan and tasks live in OpenThrottle; decisions and logs go to **plan_output_stream** via `append_plan_output` / `get_plan_output`. No separate output files.

## Rules

- **Plan and tasks context.** Ralph injects the plan and task list into the prompt from Postgres (you will see a block like "--- OpenThrottle plan (injected by Ralph from Postgres)" with Plan-Id, title, description, and Tasks). **Use that injected context**; do not call `get_plan` or `get_tasks_by_plan_id`—they are often unavailable in the agent session. If for some reason the prompt does not contain the injected block, only then try OpenThrottle MCP to load plan/tasks. Do not create or require a ref file.
- Follow [agents.mdc](../../rules/commands/agents.mdc) and [github.mdc](../../rules/commands/github.mdc).
- Task states: `BACKLOG`, `BLOCKED`, `CANCELED`, `COMPLETED`, `IN_PROGRESS`, `PENDING`, `SKIPPED`
- **One task at a time.** Resume any `IN_PROGRESS` first; otherwise pick highest-priority `PENDING`.
- **Commit frequently.** Run `/github/commit` when a task is completed and whenever the program needs to exit (e.g. before stopping or when handing off). Use conventional commits; include **Plan-Id** and **Task-Id** in the commit body or footer for traceability. Record commit hashes in task/stream as you go.

### Status updates

Always keep plan and task status in OpenThrottle up to date:

- **At run start:** The workflow CLI sets the plan to `IN_PROGRESS` at run start when OpenThrottle is configured (plan- and task-centric). The agent can still set the plan to `IN_PROGRESS` when starting a task as redundancy.
- **When starting work on a task:** Set the task to `IN_PROGRESS` via MCP `update_task(taskId, { status: 'IN_PROGRESS' })`. If the plan is still `PENDING`, set the plan to `IN_PROGRESS` (MCP `update_plan(planId, { status: 'IN_PROGRESS' })`).
- **When completing a task:** Set the task to `COMPLETED` via MCP `update_task` when available. **Always** output `<ralph:task-complete>TASK_UUID</ralph:task-complete>` (one per completed task) so the Ralph CLI can mark it completed in OpenThrottle even if MCP was not used or failed.
- **When all tasks for the plan are completed:** Set the plan to `COMPLETED` (MCP `update_plan(planId, { status: 'COMPLETED' })`).

## Signals

- **`<promise>ERROR</promise>`:** Invalid input or critical failure. Log to stream.
- **`<promise>INPUT_REQUIRED</promise>`:** User input needed (e.g. API key, approval). Leave task `IN_PROGRESS`; log what's needed.
- **`<promise>COMPLETE</promise>`:** All tasks `COMPLETED`. No `PENDING` or `IN_PROGRESS`. Run `/github/commit` before exiting.

## References

- **OpenThrottle:** What it is, how to interact, MCP tools, and Cursor commands: [openthrottle.mdc)](../../rules/commands/openthrottle.mdc). Schema and PRD attribute mapping (required / inferred / optional): [databases README](../../../databases/README.md).
- **Ralph:** [ghuntley.com/ralph](https://ghuntley.com/ralph)
- Workflow/design: [Workflow README](../../../tools/workflows/README.md) and [Ralph Design](../../../docs/workflows/ralph-design.md)
