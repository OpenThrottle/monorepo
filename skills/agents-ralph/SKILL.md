---
name: agents-ralph
description: >-
  Ralph loop: idea or PRD → OpenThrottle plan and tasks → one task at a time
  (IN_PROGRESS → work → validate → COMPLETED → /github/commit). Progress in
  plan_output_stream; record the merged squash on the work ledger (record_artifact / workflow-link-merge) only after merge. USE WHEN running
  /agents-ralph, Ralph iterations, workflow-ralph injected plan context, or
  executing OT plan tasks with Plan-Id and Task-Id traceability.
disable-model-invocation: false
---

**Important:** Echo / output immediately upon startup so we can iterate on this prompt "🚀 🤗 🌟 .agents/skills/agents-ralph - v1.0.4 🌟 🤗 🚀".

**Ralph** is a technique: run a loop (read prompt → execute one step → repeat). You tune the prompt and docs when the agent goes wrong ([ghuntley.com/ralph](https://ghuntley.com/ralph)). This prompt defines our single workflow: start with an **idea or PRD**, turn it into a **plan and tasks in OpenThrottle** _(a GraphQL service backed by Postgres)_, then **execute one task at a time** (add tasks as the work reveals more work) until every task is done. Progress lives in OpenThrottle (plan, tasks, plan_output_stream); no file-based modes.

## What Ralph does

1. **Input:** An idea or a PRD (JSON/Markdown or already in OpenThrottle). If it's rough, turn it into a **plan** and **tasks** in OpenThrottle — OpenThrottle MCP `create_plan` / `create_task` per [openthrottle.mdc](../../rules/commands/openthrottle.mdc). For a strict, hyper-detailed PRD, ensure plan/tasks in OpenThrottle match the PRD; required vs optional vs inferred attributes are defined in [Databases README.md](../../../databases/README.md).
2. **Loop:** Pick one task → set `IN_PROGRESS` → do the work → validate (e.g. `nx affected --targets lint typecheck`) → set `COMPLETED` → **run `/github/commit`**. Do **not** record a commit artifact during the loop. Record only the **squash commit after the PR is actually merged**, as a work-ledger `git_commit` artifact. On a merge-queue-protected branch, `gh pr merge` can succeed by **enqueuing** the PR rather than merging it immediately, so ledger recording must wait until the PR shows `mergedAt` / `mergeCommitSha`. Resolve the landed SHA from the merged PR or from `main` after the merge, never from the branch head that was pushed. After merge, either call the openthrottle-mcp ledger tools (`attach_session_subject` with `planId`/optional `taskId`, then `record_artifact` type `git_commit`, payload `{repo, sha}`, optional PR message) or run `pnpm exec workflow-link-merge --plan <id> --sha <squash-sha> --repo <owner/repo>` (it orchestrates the same primitives). Add new tasks when the work reveals more work. Repeat until every task is `COMPLETED`.
3. **Progress:** Plan and tasks live in OpenThrottle; decisions and logs go to **plan_output_stream** via `append_plan_output` / `get_plan_output`. No separate output files. When logging progress, pass `taskId` = the task you are **actively working** (not just the iteration seed) so output is attributed to that task and surfaces on the Task detail Output tab. One iteration can touch several tasks — tag the id of the task the log actually describes; omit `taskId` only for genuinely plan-level notes.

## Rules

- **Plan and tasks context (reads come from the injected block).** Ralph injects the plan and task list into the prompt from OpenThrottle (you will see a block like "--- OpenThrottle plan (injected by Ralph from OpenThrottle)" with Plan-Id, title, description, and Tasks). **Use that injected context**; do not call `get_plan` or `get_tasks_by_plan_id`—agent-session MCP reads are often unavailable. If for some reason the prompt does not contain the injected block, only then try OpenThrottle MCP to load plan/tasks. Do not create or require a ref file.
- **Reads vs writes (by design).** Reads come from the injected block above; **writes go through MCP** (`update_task` / `update_plan` / `append_plan_output`). Rationale: prompt injection is reliable in-session, but status mutations need a live call. Your MCP writes and the Ralph CLI's own reconciliation (it parses `<ralph:task-complete>` and writes through its configured transport — GraphQL by default) both reach the **same OpenThrottle server**; they are not separate datastores.
- Follow [agents.mdc](../../rules/commands/agents.mdc) and [github.mdc](../../rules/commands/github.mdc).
- Task states: `BACKLOG`, `BLOCKED`, `CANCELED`, `COMPLETED`, `IN_PROGRESS`, `PENDING`, `QUEUED`, `SKIPPED`
- **One task at a time.** Resume the lowest `sortOrder` `IN_PROGRESS` task first; otherwise pick the lowest `sortOrder` `PENDING` or `QUEUED`. Canonical list order is `sortOrder ASC`, `createdAt ASC` — not `createdAt` alone. Injected plan/task lists follow this order.
- **Fix task order:** prefer MCP `reorder_plan_tasks` (GraphQL `reorderPlanTasks`) over delete-and-recreate when Ralph should run tasks in a different sequence. Batch `create_tasks` appends after the plan max when `sortOrder` is omitted per item.
- **Commit frequently.** Run `/github/commit` when a task is completed and whenever the program needs to exit (e.g. before stopping or when handing off). Use conventional commits; include **Plan-Id** and **Task-Id** in the commit body or footer for traceability. Record commit hashes in task/stream as you go.
- **💰 Commit per task, but PUSH ONCE PER PLAN.** Committing is free; pushing costs a CI run. Every push to a branch with a _ready_ PR triggers the full suite, so an N-task plan used to burn N CI runs validating a branch nobody was reviewing yet — measured at ~78 CI runs/day, the single largest multiplier on CI spend. Keep the per-task commits (the footers are the traceability), and let them accumulate locally; push when the plan is done. One CI run then validates the whole batch — **the same total validation over fewer runs, never less validation**.
  - **Push mid-plan only when you must:** handing off, exiting, or a worktree at risk of being reaped. Prefer that over losing work — the cost of one extra run is trivial next to a lost plan.
  - **Do not** reach for `[skip ci]` on intermediate commits to achieve this. If the loop aborts midway it silently skips whichever commit ended up last, leaving unvalidated code on the branch.
- **💰 Keep the PR in draft until the plan completes.** `/github/pull-request` already opens in draft, and `build` skips on draft PRs — so a draft PR is the gate that makes an early push cheap. Mark it ready (`gh pr ready`) only once the **last** task is `COMPLETED`, which is also when it is actually reviewable.
- **Merge queue behavior is asynchronous.** When `main` is protected by a merge queue, treat `gh pr merge --auto` as an **enqueue** step unless the PR already reports `mergedAt`. Do not say "merged" until the queue lands it; if Ralph or a follow-up session needs the shipped SHA for the OT work ledger, poll `gh pr view --json mergedAt,mergeCommitSha` or inspect `main`, then record only that landed SHA.

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
