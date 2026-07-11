# Ralph design (v4 — source of truth)

**Canonical prompt:** `.cursor/skills/agents-ralph/SKILL.md`. Previous agentic prompt versions (v2, v3) are deprecated; this doc describes the single workflow.

> **Which path runs when?** This doc describes the Ralph workflow itself. For the **single canonical
> decision table** of execution surfaces (Local CLI vs Plans queue spawn vs Plans queue
> orchestrator) — trigger → surface → host process → transport → post-run checks — see
> [tools/workflows/README.md → Which path runs when](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table)
> and the full map in
> [ralph-execution-paths-and-package-layering.md](./ralph-execution-paths-and-package-layering.md).

## Goal

- **Ralph** runs a single workflow: idea or PRD → **plan and tasks in OpenThrottle** → execute one task at a time until done. Progress lives in OpenThrottle (plan, tasks, `plan_output_stream`); no file-based modes or OUTPUT files.
- Input can be a rough idea (use `/openthrottle/planning-mode` or OT MCP `create_plan` / `create_task` to turn it into a plan + tasks) or a **strict, hyper-detailed PRD** (ensure plan/tasks in OT match the PRD; required vs optional vs inferred attributes are in `databases/README.md`).

## Modes

- **Plan-centric (default):** `workflow-ralph --plan <plan-uuid>`. No ref file is written during the run. The agent receives Plan-Id in the prompt with the plan/task list **injected** (reads come from that injected block; OT MCP is only a fallback when the block is absent). When OpenThrottle is available, the CLI sets the plan to `IN_PROGRESS` at run start.
- **Task-centric:** `workflow-ralph --task <task-uuid>` (or `--plan <plan-uuid> --task <task-uuid>`). No ref file is written during the run; the agent receives Plan-Id and Task-Id in the prompt and uses OT MCP. CLI sets the plan to `IN_PROGRESS` at run start when OT is available, sets task to `IN_PROGRESS` before the run, and sets task to `COMPLETED` when the agent emits `<promise>COMPLETE</promise>`; agent works on that single task only.

## Single workflow (OpenThrottle only)

| Step     | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input    | Idea, PRD (JSON/Markdown), or existing OT plan ID. If rough → planning mode or MCP to create plan + tasks.                                                                                                                                                                                                                                                                                                                                                                               |
| Plan     | Plan and tasks live in OpenThrottle. Load via `get_plan(id)`, `get_tasks_by_plan_id(planId)`. In task-centric mode, load via `get_task(taskId)` and use `planId` from the task.                                                                                                                                                                                                                                                                                                          |
| Loop     | Pick one task → `update_task(..., 'IN_PROGRESS')` → do work → validate (e.g. `nx affected --targets lint typecheck`) → `update_task(..., 'completed')` → `/github/commit` (conventional commits; include `Plan-Id` and `Task-Id` in body or footer). Add tasks as work reveals more. In task-centric mode, the CLI sets IN_PROGRESS before the run and completed when the agent signals COMPLETE. Do not call `link_commit` during the loop; link only the squash commit after PR merge. |
| Progress | `append_plan_output` / `get_plan_output` for iteration log. No OUTPUT files.                                                                                                                                                                                                                                                                                                                                                                                                             |

## PRD and OpenThrottle attribute mapping

- For a **strict, hyper-detailed PRD**: create or update plan/tasks in OpenThrottle so they match the PRD. Required, inferred, and optional fields are in **`databases/README.md`** under "Plan and task attributes (PRD mapping)".
- Required for plans: `title`. The agent infers `author` (GitHub handle) when missing; for `category`, infer when missing or confirm/adjust when provided so it fits the plan. Required for tasks: `title`, `plan_id`. Timestamps are always handled by the DB.

## Signals

- **`<promise>ERROR</promise>`:** Invalid input or critical failure. Log to stream.
- **`<promise>INPUT_REQUIRED</promise>`:** User input needed. Leave task `IN_PROGRESS`; log what's needed.
- **`<promise>COMPLETE</promise>`:** All tasks `COMPLETED`. Run `/github/commit` before exiting.

## CLI usage

- **Plan-centric:** `pnpm exec workflow-ralph --plan <openthrottle-plan-uuid>` (optional: `--iterations`, `--model`, `--prompt`, `--backend cursor|claude` — **one** runner for the entire run).
- **Task-centric:** `pnpm exec workflow-ralph --task <openthrottle-task-uuid>` (plan is resolved from the task; OpenThrottle Postgres env required). Or `--plan <plan-uuid> --task <task-uuid>` to pass both.

## Plan-centric task status

The CLI sets the plan to `IN_PROGRESS` at run start. Each iteration it fetches remaining tasks (PENDING, IN_PROGRESS, BLOCKED), **resumes the lowest `sortOrder` IN_PROGRESS task if any** (so a previously started task is not skipped), otherwise picks the lowest `sortOrder` PENDING or QUEUED task and sets it to `IN_PROGRESS`. Task lists and next-task selection use canonical order **`sortOrder ASC`, `createdAt ASC`** — not `createdAt` alone. See `databases/README.md` § Task sort_order and `packages/openthrottle-agentic-ralph/src/utils/plan-task-list-order.ts` (`pickRalphTaskForIteration`).

To fix execution order without delete-and-recreate, use GraphQL `reorderPlanTasks` or MCP `reorder_plan_tasks` (renumbers `1000, 2000, …` in the given task-id order). Batch `create_tasks` appends new tasks after the plan max when `sortOrder` is omitted per item.

The CLI injects the chosen task ID into the agent prompt with a reminder to output `<ralph:task-complete>TASK_UUID</ralph:task-complete>` when done. The agent should also call MCP `update_task(..., 'completed')` when available. The CLI parses both stdout and stderr for the tag and marks those tasks `COMPLETED` in OpenThrottle (through its configured transport — GraphQL by default). **Fallback:** if the agent emits `<promise>COMPLETE</promise>` but does not emit the complete-task tag, the CLI still marks the current iteration’s task (the one set to IN_PROGRESS for that run) as `COMPLETED` so OpenThrottle stays in sync.

## Max iterations and task cleanup

When Ralph hits the iteration cap (e.g. `--iterations 10`) and there is still work to do (remaining tasks), the loop exits with code 0 and logs "All iterations have completed. Exiting...".

- **Current behavior (without cleanup):** The task that was set to **IN_PROGRESS** for the last iteration can be left stuck in that state if the agent did not emit `<ralph:task-complete>` or `<promise>COMPLETE</promise>`. The next plan run would then see that task as IN_PROGRESS and resume it, but operators may expect it to be PENDING so "first PENDING" ordering is clear.
- **Cleanup strategy (desired):** Before exit(0), the CLI sets that task back to **PENDING** so the next plan run (or re-queue) can pick it up. No automatic re-queue in the plans processor (e.g. re-adding the job when Ralph exits due to max iterations)—that is costly; cleanup in `workflow-ralph` is sufficient.

Implementation: see `tools/workflows/README.md` § Workflow Ralph → "Max iterations and task cleanup", and `src/bin/ralph.ts` (cleanup before `MESSAGE_COMPLETED` and `process.exit(0)`). Plan: `970aecc7-c647-4948-aa20-410e1bd090fc`.

## Limiting factors (plan status)

The CLI sets the plan to `IN_PROGRESS` at run start when OpenThrottle is configured (plan- and task-centric). Remaining limitation:

- **Work outside workflow-ralph** — Work started outside the CLI (e.g. manual Cursor work with a Plan-Id) will not set the plan to `IN_PROGRESS` unless the user runs a script or uses MCP.

## OpenThrottle required; no ref file

Ralph requires OpenThrottle (OT) to be configured and reachable for plan/task mode; the CLI fails fast with a clear error if the DB is unreachable. Startup uses a **direct OpenThrottle Postgres** check (`ensureDatabaseReachableOrExit`), not the GraphQL `getServerHealth` query — a transitional Postgres-direct exception flagged for removal in [`graphql-only-transport-boundary.md`](./graphql-only-transport-boundary.md); see **`tools/workflows/README.md`** § Workflow Ralph → **`getServerHealth` vs workflow GraphQL transport errors** for when health complements thrown HTTP/GraphQL client errors in other tooling. Ralph does **not** write a ref file; the agent always receives Plan-Id (and optional Task-Id) in the prompt with the plan/task list **injected** (reads come from that injected block; OT MCP is only a fallback when the block is absent — agent-session MCP reads are often unavailable). **Reads vs writes (by design):** reads are injected, but status **writes go through MCP** (`update_task` / `update_plan` / `append_plan_output`); the agent's MCP writes and the CLI's own `<ralph:task-complete>` reconciliation (which writes through its configured transport — GraphQL by default) both reach the **same OpenThrottle server**, not separate datastores. This matches the read-injected/write-MCP rule in the agents-ralph SKILL. Cross-repo: invoke with `--plan` or `--task` and set OpenThrottle env in the calling repo; see **`tools/workflows/README.md`** § Cross-repo usage.

## References

- **Server-side Ralph (BullMQ):** Local CLI vs nested `workflow-ralph` spawn vs in-process orchestrator (`enqueuePlanRun` vs `enqueuePlanRalphOrchestrator`) — `tools/workflows/README.md` § Worktree + BullMQ workflow. Compose/Docker/path deferrals: investigation plan `677b6849-1912-4fa8-a5f6-d8233f2cdf97`.
- **Agentic prompt (v4):** `.cursor/skills/agents-ralph/SKILL.md`
- **Runtime configuration (agents, limits, future prompt overrides):** [ralph-workflow-runtime-config.md](./ralph-workflow-runtime-config.md)
- **OpenThrottle MCP rules:** `.cursor/rules/commands/openthrottle.mdc`, `databases/README.md`
- **Cross-repo usage:** `tools/workflows/README.md` § Cross-repo usage and [tools/workflows/docs/cross-repo-usage.md](../../tools/workflows/docs/cross-repo-usage.md)
- **Ralph technique:** [ghuntley.com/ralph](https://ghuntley.com/ralph)
