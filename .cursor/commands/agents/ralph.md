# Instructions

**Ralph** is a technique: run a loop (read prompt → execute one step → repeat). You tune the prompt and docs when the agent goes wrong ([ghuntley.com/ralph](https://ghuntley.com/ralph)). This prompt defines our single workflow: start with an **idea or PRD**, turn it into a **plan and tasks in OpenThrottle** _(a Postgres Database)_, then **execute one task at a time** (add tasks as the work reveals more work) until every task is done. Progress lives in OpenThrottle (plan, tasks, plan_output_stream); no file-based modes.

## What Ralph does

1. **Input:** An idea or a PRD (JSON/Markdown or already in OpenThrottle). If it's rough, turn it into a **plan** and **tasks** in OpenThrottle — use **`/ot/planning-mode`** (or OpenThrottle MCP `create_plan` / `create_task` per `.cursor/rules/commands/cortex.mdc`). For a strict, hyper-detailed PRD, ensure plan/tasks in OpenThrottle match the PRD; required vs optional vs inferred attributes are defined in `databases/cortex/README.md`.
2. **Loop:** Pick one task → set `in_progress` → do the work → validate (e.g. `nx affected --targets lint typecheck`) → set `completed` → **run `/github/commit`**. Do **not** call `link_commit` during the loop. Link only the **squash commit after the PR is merged** (so `commit_links` stores the one SHA on main). After merge, call `link_commit` (ai-mcp) with `planId`, `repo`, squash SHA, optional `taskId`, and PR message, or run `pnpm exec workflow-link-merge --plan <id> --sha <squash-sha> --repo <owner/repo>`. Add new tasks when the work reveals more work. Repeat until every task is `completed`.
3. **Progress:** Plan and tasks live in OpenThrottle; decisions and logs go to **plan_output_stream** via `append_plan_output` / `get_plan_output`. No separate output files.

## Rules

- **Plan and tasks context.** Ralph injects the plan and task list into the prompt from Postgres (you will see a block like "--- OpenThrottle plan (injected by Ralph from Postgres)" with Plan-Id, title, description, and Tasks). **Use that injected context**; do not call `get_plan` or `get_tasks_by_plan_id`—they are often unavailable in the agent session. If for some reason the prompt does not contain the injected block, only then try OpenThrottle MCP to load plan/tasks. Do not create or require a ref file.
- Follow `.cursor/rules/commands/agents.mdc` and `.cursor/rules/commands/github.mdc`.
- Task states: `pending`, `in_progress`, `completed`, `blocked`, `skipped`.
- **One task at a time.** Resume any `in_progress` first; otherwise pick highest-priority `pending`.
- **Commit frequently.** Run `/github/commit` when a task is completed and whenever the program needs to exit (e.g. before stopping or when handing off). Use conventional commits; include **Plan-Id** and **Task-Id** in the commit body or footer for traceability. Record commit hashes in task/stream as you go.

### Status updates

Always keep plan and task status in OpenThrottle up to date:

- **At run start:** The workflow CLI sets the plan to `in_progress` at run start when OpenThrottle is configured (plan- and task-centric). The agent can still set the plan to `in_progress` when starting a task as redundancy.
- **When starting work on a task:** Set the task to `in_progress` (MCP `update_task(taskId, { status: 'in_progress' })` or `pnpm exec tsx ./scripts/update-cortex-task-status.ts <task-id> in_progress`). If the plan is still `pending`, set the plan to `in_progress` (MCP `update_plan(planId, { status: 'in_progress' })` or `pnpm exec tsx ./scripts/update-cortex-plan-status.ts <plan-id> in_progress`).
- **When completing a task:** Set the task to `completed` via MCP `update_task` when available. **Always** output `<ralph:task-complete>TASK_UUID</ralph:task-complete>` (one per completed task) so the Ralph CLI can mark it completed in OpenThrottle even if MCP was not used or failed.
- **When all tasks for the plan are completed:** Set the plan to `completed` (MCP `update_plan` or `./scripts/update-cortex-plan-status.ts`).

## Signals

- **`<promise>ERROR</promise>`:** Invalid input or critical failure. Log to stream.
- **`<promise>INPUT_REQUIRED</promise>`:** User input needed (e.g. API key, approval). Leave task `in_progress`; log what's needed.
- **`<promise>COMPLETE</promise>`:** All tasks `completed`. No `pending` or `in_progress`. Run `/github/commit` before exiting.

## References

- **OpenThrottle:** What it is, how to interact, MCP tools, and Cursor commands: `.cursor/rules/commands/cortex.mdc`. Schema and PRD attribute mapping (required / inferred / optional): `databases/cortex/README.md`.
- **Ralph:** [ghuntley.com/ralph](https://ghuntley.com/ralph)
- This prompt: `.cursor/commands/agents/ralph.md`
- Workflow/design: `tools/workflows/README.md`, `docs/workflows/ralph-design.md`
