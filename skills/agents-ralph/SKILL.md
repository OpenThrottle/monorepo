---
description: >-
  Execute an OpenThrottle plan headlessly, a task at a time, turning an idea or
  PRD into a plan first if needed. USE WHEN running /agents-ralph, on a Ralph
  iteration, or when workflow-ralph has injected plan context. Self-contained —
  the CLI feeds this file to an agent as a standalone prompt. Interactive runs
  use ot-loop.
metadata:
  author: openthrottle
  last-reviewed: '2026-11-14'
  version: '1.1.0'
name: agents-ralph
---

**Ralph** is a loop: read prompt, execute one step, repeat ([ghuntley.com/ralph](https://ghuntley.com/ralph)). Start with an **idea or PRD**, turn it into a **plan and tasks in OpenThrottle** _(a GraphQL service backed by Postgres)_, then **execute one task at a time** (add tasks as the work reveals more) until every task is done. Progress lives in OpenThrottle (plan, tasks, plan_output_stream); no file-based modes.

This prompt is fed standalone by `workflow-ralph`, often in a foreign checkout where no other skill is reachable, so it restates the per-task discipline. The canonical statement is the `ot-loop` skill § The loop — when you change one, change both.

## What Ralph does

1. **Input:** An idea or a PRD (JSON/Markdown or already in OpenThrottle). If it's rough, turn it into a **plan** and **tasks** with MCP `create_plan` / `create_task` (see the `ot-plans` skill). For a strict PRD, make the plan/tasks match it; required vs optional vs inferred attributes are in the [databases README](https://github.com/openthrottle/monorepo/blob/main/databases/openthrottle/README.md).
2. **Loop:** Pick one task → set `IN_PROGRESS` → do the work → validate (e.g. `nx affected --targets lint typecheck`) → set `COMPLETED` → **run `/github-commit`**.
   - Do **not** record a commit artifact during the loop, and do not wait for the merge to record one either. There is no post-merge ledger step.
   - Under the orchestrator the host settles with `headSha` / `prNumber` after it pushes; on interactive `/ot-loop` you open the PR then settle.
   - If a run dies before a PR exists, the hourly trailer harvest adopts the work from the `Plan-Id:` footers on `main`.
   - Add new tasks when the work reveals more work — before completing the plan's last open task, which closes the plan (if already closed, `update_plan` it back to `IN_PROGRESS` first).
   - Repeat until every task is `COMPLETED`.
3. **Progress:** Decisions and logs go to **plan_output_stream** via `append_plan_output` / `get_plan_output`; no output files. Pass `taskId` = the task the log actually describes (it surfaces on the Task detail Output tab); omit it only for plan-level notes.

## Rules

- **Reads come from the injected block.** Ralph injects the plan and task list into the prompt ("--- OpenThrottle plan (injected by Ralph from OpenThrottle)", with Plan-Id, title, description, Tasks). Use it; do not call `get_plan` or `get_tasks_by_plan_id`. Only if the block is missing, load plan/tasks via MCP. Do not create or require a ref file.
- **Writes go through MCP** (`update_task` / `update_plan` / `append_plan_output`). Your MCP writes and the Ralph CLI's own reconciliation (it parses `<ralph:task-complete>`) reach the same OpenThrottle server.
- **Never attribute a commit or PR to a tool or an agent.** No `Co-authored-by`, no "Made with" line, no link to an agent vendor — in commit messages, PR descriptions, or any other output.
- The only permitted footers are conventional-commit ones: `BREAKING CHANGE:`, `Closes #123`, `Plan-Id:`, `Task-Id:`.
- Follow [AGENTS.md](https://github.com/openthrottle/monorepo/blob/main/AGENTS.md) § Code style and the `github-commit`, `github-pull-request` and `github-squash` skills.
- Task states: `BACKLOG`, `BLOCKED`, `CANCELED`, `COMPLETED`, `IN_PROGRESS`, `PENDING`, `PROMOTED`, `QUEUED`, `SKIPPED`
- **One task at a time.** Resume the lowest `sortOrder` `IN_PROGRESS` task first; otherwise pick the lowest `sortOrder` `PENDING` or `QUEUED`. Order is `sortOrder ASC`, `createdAt ASC`, and injected lists follow it.
- **Fix task order** with MCP `reorder_plan_tasks`, not delete-and-recreate. Batch `create_tasks` appends after the plan max when `sortOrder` is omitted.

### Plan inbox

- A human can steer a live run through the plan inbox. At the start of every iteration, and before each further task, call MCP `claim_plan_messages({ planId, taskId })` for the task you are about to start, before setting it `IN_PROGRESS`. Claiming is delivery, so once per boundary.
- Apply `STEER`s first: they override the task description and injected context ("skip task X" → `SKIPPED`; "stop after this" → finish the current task, commit, exit).
- Then apply `QUEUE`s as extra requirements; one meant for a later task becomes a `create_tasks` entry or a note on that task.
- Acknowledge each message via `append_plan_output` (with `taskId`). An empty result is the common case; a failed claim only delays delivery, so log it and carry on. Canonical: `ot-loop` § Your run row.
- **Claim again mid-task, before anything you cannot take back:** right before deleting files, a migration, a history rewrite or a push, and on both sides of a subagent handoff. A `STEER` then pauses the step, redirects the task, or aborts it to `BLOCKED` (summary quotes it); the task stays the one `IN_PROGRESS`. Canonical: `ot-loop` § Mid-task claims.

### Commits and pushes

- **Commit frequently.** Run `/github-commit` when a task is completed and whenever the program needs to exit. Conventional commits with **Plan-Id** and **Task-Id** in the body or footer.
- A task that changes no tracked file needs no commit — don't make an empty or cosmetic one; the squash takes its Task-Id from OT. Record commit hashes in task/stream as you go.
- **Commit per task, push once per plan.** Every push to a branch with a ready PR runs the full CI suite; let per-task commits accumulate locally.
- **Never** use `[skip ci]` on intermediate commits: an aborted loop would leave the last one unvalidated.
- **Orchestrator / scheduled plan run (this prompt under `workflow-ralph`):** you commit per task. You do **not** `git push`, open a PR, or run `gh pr ready`; the orchestrator owns push + PR at plan end (draft → ready once every task is `COMPLETED`).
- **A run that can make no further progress** (only `BLOCKED` tasks left, or the iteration/time limit hit with work pending) ends the plan `BLOCKED`, still pushes, and opens a draft PR listing what is blocked or pending. So when a task genuinely can't be finished, set it `BLOCKED` and move on. A denied `git push` is not yours to escalate — see Signals.
- **Final orchestrated iteration:** the orchestrator appends an `OT_FINAL_ITERATION=1` line to your prompt when your current task is the plan's last workable one (`BLOCKED` siblings don't count). That line is the trigger; don't infer "last" yourself.
  - Once the task is `COMPLETED` and committed, run `/github-pull-request` in its draft-only (orchestrator) mode.
  - It writes `title.txt` and `body.md` into the draft directory the `OT_FINAL_ITERATION=1` line names (also `$OT_PR_DRAFT_DIR`; otherwise `.ot-pr-draft/` at the worktree root), covering the whole `<base>..HEAD` range. Always regenerate it.
  - You still never push, and never create, edit or ready the PR; the host validates and publishes the draft. A draft failure is not a blocker: log it with `append_plan_output` and emit `COMPLETE` as normal.
- **Interactive `/ot-loop`:** push **once per plan**, open the PR as a draft via `/github-pull-request`, and `gh pr ready` only once the **last** task is `COMPLETED`. Mid-plan push only when you must: handing off, exiting, or a worktree at risk of being reaped.
- **Merge queue is asynchronous.** Treat `gh pr merge --auto` as an enqueue step until the PR reports `mergedAt`. Do not say "merged" until the queue lands it; poll `gh pr view <n> --json mergedAt,mergeCommit --jq '{mergedAt, sha: .mergeCommit.oid}'`.

### Status updates

Always keep plan and task status in OpenThrottle up to date:

- **At run start:** The workflow CLI sets the plan to `IN_PROGRESS` when OpenThrottle is configured. You can set it again when starting a task as redundancy.
- **Starting a task:** `update_task(taskId, { status: 'IN_PROGRESS' })`. If the plan is still `PENDING`, `update_plan(planId, { status: 'IN_PROGRESS' })`. Then call `begin_task_session({ planId, taskId, model })` with the model you are running as; omit it rather than guess. You run the whole plan on one model, so model routing does not apply to you.
- **Completing a task:** Set it `COMPLETED` via `update_task` when available. **Always** output `<ralph:task-complete>TASK_UUID</ralph:task-complete>` (one per completed task) so the Ralph CLI can mark it completed even if MCP failed.
- **Closing the plan:** Re-fetch tasks. Any `IN_PROGRESS` / `PENDING` / `QUEUED` → fix those first; else any `BLOCKED` → `update_plan(planId, { status: 'BLOCKED' })` (still draft PR + settle the run `COMPLETED`); else → `update_plan(planId, { status: 'COMPLETED' })`. The server refuses `COMPLETED` over unresolved tasks — a refusal means take the `BLOCKED` branch, not retry.

## Signals

- **`<promise>ERROR</promise>`:** Invalid input or critical failure. Log to stream.
- **`<promise>INPUT_REQUIRED</promise>`:** Reserved for a **human decision or input that blocks finishing a task** (e.g. which API key to use). Leave the blocked task `IN_PROGRESS`; log what's needed.
  - It is **not** for a permission-denied tool (`git push`, `curl`, browser automation), a missing verification you owe, or any other host/environment failure.
  - Those: log a diagnostic chunk via `append_plan_output`, file a follow-up plan (`tags: ['follow-up']`) if the work still needs a human, and continue.
  - Once every task is `COMPLETED`, emit `COMPLETE` — never `INPUT_REQUIRED`.
- **`<promise>COMPLETE</promise>`:** All tasks `COMPLETED`; none `PENDING` or `IN_PROGRESS`. Run `/github-commit` before exiting. Under the orchestrator, do not push or open a PR before exiting — the host finalizes.

## References

- **OpenThrottle:** tool selection and gotchas: the `ot-plans` skill. Schema and PRD attribute mapping: [databases README](https://github.com/openthrottle/monorepo/blob/main/databases/openthrottle/README.md).
- **Ralph:** [ghuntley.com/ralph](https://ghuntley.com/ralph)
- Workflow/design: [Workflow README](https://github.com/openthrottle/monorepo/blob/main/tools/workflows/README.md) and [Ralph Design](https://github.com/openthrottle/monorepo/blob/main/docs/workflows/ralph-design.md)
