---
name: ot-loop
description: >-
  Drive one OpenThrottle plan to a PR with the built-in /loop, a task at a time
  in an isolated worktree. USE WHEN the user runs /ot-loop <planId>, says
  "loop over plan <id>", or wants a plan executed autonomously. Not for authoring
  plans (ot-plans) or the headless server-side runner (the OT Loop job).
# Claude Code reads argument-hint and arguments for slash-command argument substitution (`$planId` in the body).
argument-hint: <planId>
# Same reason: declares the $planId argument for Claude Code's substitution.
arguments:
  planId: string
metadata:
  author: openthrottle
  last-reviewed: '2026-11-22'
  version: '1.3.0'
---

`$planId` is the only argument. If it is not an OpenThrottle plan or task id, stop and say so.

Run the built-in **`/loop`** over OpenThrottle plan **`$planId`**: one task at a time, OT status kept
in sync, progress narrated to the plan output stream, and a PR when the plan is done.

## Setup (once, before the loop)

A session started from a kickoff brief (`/ot-loop <planUuid>` on line 1 — [`ot-plans` § Follow-ups and session kickoff](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plans/SKILL.md#follow-ups-and-session-kickoff)) begins here, at step 1, like any other run.

1. **Load the plan and tasks** — `get_plan(planId)` + `get_tasks_by_plan_id(planId)` (or `get_remaining_tasks_for_plan`). Canonical order is `sortOrder ASC, createdAt ASC`. If tasks are out of sequence, fix with `reorder_plan_tasks` (never delete-and-recreate).
2. **Decide whether the plan ships code.** If no task will change a tracked file (an audit, a review, OT-only work), this is a **no-files run**: skip the worktree (step 3), validation beyond what a task asks for, and everything in [§ Finishing](#finishing) after step 1 except settling, which takes no `headSha` / `prNumber`. Everything else below still applies.
3. **Work in an isolated worktree on a feature branch**, never on the base checkout. Creating, healing and removing worktrees is the `ot-worktree` skill's job — use it for every worktree interaction in this loop, never a bare `git worktree` command (a bare add skips the repo's provisioner; a bare remove skips the teardown hook and the safety checks). Name it for the plan (e.g. `feat/openthrottle-drivers`); rename the generated branch with `git branch -m` for a different prefix. The new branch forks from the remote's default branch as last fetched (`ot-worktree` § What the new branch forks from): create does not fetch, so `git fetch` first if the default branch has moved. Use the path create prints.
4. **Set the plan `IN_PROGRESS`** via `update_plan(planId, { status: 'IN_PROGRESS' })` if it isn't already.
5. **Open a run row** — `register_plan_run({ planId, model, branch })`, then, once the worktree exists, `register_plan_run_worktree_checkout({ planRunId, filesystemPath })`. Carry the returned run id: every exit settles it. Read [`references/run-row.md`](./references/run-row.md) before registering — which model to declare, what not to pass, and why it is best-effort.

## The loop (one task at a time)

> **This section is the canonical statement of the per-task discipline.** One deliberate
> restatement changes with it, in the same PR: the OT Loop job, its headless implementation in code
> (`packages/openthrottle-agentic-loop`; [design](https://github.com/openthrottle/monorepo/blob/main/docs/workflows/ot-loop-job.md), whose § 9
> names its one exception). Everything else links here.

Each `/loop` iteration works exactly one task. Resume the lowest-`sortOrder` `IN_PROGRESS` task first; otherwise pick the lowest `sortOrder` `PENDING`/`QUEUED`.

> **Invariant — at most ONE task `IN_PROGRESS` at a time.** Steps 1→5 are one atomic unit: never run step 1 (`IN_PROGRESS`) for a task while another task is still `IN_PROGRESS`. Even when you power through several tasks in a single turn, fully close the current one — through **step 4 (`COMPLETED`)** — _before_ you start the next. Dropping the step-4 flip strands the task `IN_PROGRESS` with no server-side reconcile. **This is the most common failure of this loop** — two tasks `IN_PROGRESS` means you skipped a step 4. Issue the step-4 flip and the next step-1 flip as separate calls, never in one parallel batch.

1. **Start:** `update_task(taskId, { status: 'IN_PROGRESS' })`, then `begin_task_session({ planId, taskId, model })` to open a work session scoped to this task carrying the model that will do its work. (Precondition: no other task is `IN_PROGRESS` — see the invariant above.) Where `model` comes from is [§ Model routing](#model-routing); declare what will actually do the work, and omit it rather than guess — a session's model is fixed when it opens and cannot be corrected later.
2. **Do the work** for that task, following the repo's rules. Do it yourself, or hand it to a subagent on the routed model — [§ Model routing](#model-routing). **This is the only step that may be delegated.**
   - **Claim the inbox before any destructive step** (delete, migrate, rewrite history, push) **and on both sides of a delegation** — [§ Your run row](#your-run-row).
3. **Validate** before completing with the repo's own checks for the touched projects, run **sequentially** (Nx targets share a cache). Don't mark a task done on red.
4. **Complete — do this BEFORE starting any other task:** `update_task(taskId, { status: 'COMPLETED' })`. If the task genuinely can't be finished, set `BLOCKED` or `SKIPPED` instead — but never leave it `IN_PROGRESS` while you move on. Committing the work (step 5) is **not** a substitute for this flip. **On the plan's last open task, do step 6 first.**
5. **Commit per task** with `/github-commit` — conventional commit, with `Plan-Id:` and `Task-Id:` footers for traceability. Do **not** record a work-ledger artifact for these per-task work commits; the footers carry the traceability. A task that changes no tracked file needs **no** commit — never make an empty or cosmetic one to carry the footer. Its step-4 `COMPLETED` flip is the record; the squash picks it up from OT (`github-squash` § Footers).
   - **Commit per task, push once per plan.** Every push to a branch with a ready PR triggers a full CI run; one push at the end validates the whole batch. Push mid-plan only to hand off, exit, or save a worktree at risk of being reaped.
6. **Add tasks when the work reveals more work** (`create_tasks` appends after the plan max when `sortOrder` is omitted). Completing the last open task closes the plan, so add them **before** that step-4 flip. Already closed? `update_plan` it back to `IN_PROGRESS` first.
7. **Repeat** — before selecting the next task, confirm the one you just finished is `COMPLETED` (not still `IN_PROGRESS`), then poll for a cancel and claim the plan inbox ([§ Your run row](#your-run-row)). Continue until no task is `PENDING`, `QUEUED` or `IN_PROGRESS`.

**Narrate as you go.** Use `append_plan_output(planId, ...)` for decisions and progress, passing `taskId` = the task the log actually describes (omit only for genuinely plan-level notes). One iteration can touch several tasks — tag the right id.

## Model routing

The policy is data: [`references/model-routing.json`](./references/model-routing.json). Read it rather
than reasoning from memory. **Lookup:** lower-case the task's `category` and find it in
`categories`; a hit names a tier, a miss or blank category is `default` (the cheap tier — never
escalate just because a category is unfamiliar). The tier gives `agentModel` (the Agent tool's
`model`) and `recordAs` (declare it to `begin_task_session`); the two must agree. Guardrails (one
non-default-tier agent at a time; routing can never select the most expensive tier), the delegation
prompt template and headless-runner behaviour: read
[references/model-routing.md](./references/model-routing.md) before delegating step 2 or choosing a
non-default tier. In the JSON, mind `READ_COST_CORRECTLY`.

### What delegates, and what never does

Step 2 is the only delegatable step; the status flips (steps 1 and 4), session open, validation
(step 3), the commit (step 5), narration, the cancel poll and inbox claim, and settling the run row
all stay in the parent turn. A subagent must not touch OT status or git history; it reports back and
the parent decides. If it fails or returns something unusable, the parent still owns step 4 — set
`BLOCKED` rather than leaving the task `IN_PROGRESS`.

A subagent inherits none of your context: build its prompt from the task row alone (template in
[references/model-routing.md](./references/model-routing.md)). A row too thin to delegate from is a
signal about the row: do the task in the parent turn.

## Intra-task fan-out

Step 2 may be worked by several agents in parallel; nothing else changes (one task `IN_PROGRESS`,
the parent owns flips, validation and the single commit). Eligible only when the work splits into
units with **disjoint file sets** and no shared invariant coupling them; otherwise the parent does
step 2 itself. Fan-out agents never mutate OT, commit, push or run any `nx` target (concurrent
targets contend on the shared `.nx` cache); the parent validates sequentially after they rejoin.
Cheap-tier fan-out is capped at 4 agents at once, non-default tier at 1. Read
[references/fan-out.md](./references/fan-out.md) before fanning out.

## Your run row

An interactive run has no CLI heartbeating for it, so three duties are yours. The details, the
mid-task claim points and how to handle each kind of message are in
[`references/run-row.md`](./references/run-row.md): read it once before the first task.

- **At each task boundary, poll for a cancel**: `get_plan_runs(planId)`, check your run's
  `cancelRequestedAt`; if set, stop and settle `CANCELLED`. This is the only way a Kill reaches an
  interactive run: an unpolled cancel silently does nothing.
- **Then claim the inbox** for the task you are about to start: `claim_plan_messages({ planId,
planRunId, taskId })`, once per boundary (claiming is delivery). Apply `STEER`s first, then
  `QUEUE`s; acknowledge each in `append_plan_output` with the task's `taskId`.
- **Claim again mid-task** right before deleting files, a migration or shared-DB write, a history
  rewrite or push, and on both sides of a subagent handoff.

> **Invariant — every exit path settles the run.** `settle_plan_run(planRunId, status)`: `COMPLETED`
> when the PR opens (or, on a no-files run, when the last task closes), `CANCELLED` on a deliberate
> stop, `FAILED` when you give up. On a `COMPLETED` run that opened a PR, also pass `headSha` and
> `prNumber` — that call is what puts the work on the ledger. A row never settled sits
> `IN_PROGRESS` forever and holds its worktree marked busy. Settling twice is a safe no-op.

Three backstops settle an abandoned run to `STALE` after a crash, and Claude Code hooks warn on
missed duties; neither replaces the invariant. Details: [references/backstops.md](./references/backstops.md),
[references/workflow-hooks.md](./references/workflow-hooks.md).

## Finishing

1. **Close the plan with a three-way status check.** Re-fetch `get_tasks_by_plan_id(planId)` (or `get_remaining_tasks_for_plan`), then decide:
   - **Any task is `IN_PROGRESS`, `PENDING`, or `QUEUED`:** fix that task first — flip it to `COMPLETED` / `BLOCKED` / `SKIPPED` as appropriate (`PROMOTED` also counts as resolved). A committed task left `IN_PROGRESS` is the usual culprit (see the loop invariant). Do not set the plan status yet.
   - **Else any task is `BLOCKED`:** `update_plan(planId, { status: 'BLOCKED' })`. A run that can make no further progress ends the plan `BLOCKED`, still opens the draft PR listing what is blocked (step 5), settles the run `COMPLETED` (step 6), and leaves the PR in draft; a human unblocks and re-enqueues it.
   - **Else** (every task is `COMPLETED` / `SKIPPED` / `CANCELED` / `PROMOTED`, or the plan has zero tasks): `update_plan(planId, { status: 'COMPLETED' })`.

   The server refuses `COMPLETED` while any task is unresolved (`BLOCKED` / `IN_PROGRESS` / `PENDING` / `QUEUED`). A refusal means take the `BLOCKED` branch (or fix open work), not retry `COMPLETED`. This re-fetch is mandatory — never skip it.

2. **Run the repo's full local gate** and fix what it flags.
3. **Squash with `/github-squash`.** Its `Task-Id:` footers come from OT, so commitless tasks are carried too. It squashes onto the branch's merge-base and then rebases onto `<remote>/<default>` (from the github-pull-request resolver) — never soft-reset straight onto a moved default branch, which silently reverts whatever landed after the branch forked.
4. **Confirm one commit on top of the current default branch:** `git rev-list --count <remote>/<default>..HEAD` is `1` and `git rev-list --count HEAD..<remote>/<default>` is `0`. If it moved again, `git fetch <remote> <default> && git rebase <remote>/<default>`. Fetch the remote-tracking ref, not `<default>:<default>`: git refuses to update a branch the base checkout has checked out.
5. **Open a Draft PR** with `/github-pull-request` — the single push for the whole plan. Leave it in **draft** until the work is genuinely up for review (`gh pr ready`). **Capture the PR URL and number, and the branch head sha.**
6. **Settle your run row, with the sha and the PR number** — `settle_plan_run(planRunId, 'COMPLETED', headSha, prNumber)`. The server writes the ledger artifacts from them; there is nothing to do after the merge (the `ot-plans` skill § Work ledger owns the rest). `gh pr merge --auto` only enqueues on a merge queue, so do not read a landed sha until `gh pr view <n> --json mergedAt,mergeCommit` shows one.
7. **Stop the loop** once the PR is open. Do **not** merge.

## Teardown the worktree (only after a successful PR)

Once — and **only** once — the PR is confirmed open and `git status` in the worktree shows nothing
uncommitted or unpushed, tear down the isolated worktree by following
[`references/teardown.md`](./references/teardown.md). If PR creation failed or anything is
unpushed, **do not tear down**: leave the worktree intact, settle your run row `FAILED`, and report.

## In OpenThrottle repos

Skip this section when the commands it names do not exist.

- **Codegen first:** a fresh worktree needs `pnpm nx run-many --target=codegen-graphql --all` before app tests will collect.
- **Validation (loop step 3):** `pnpm nx affected --target=lint,typecheck,test`, run sequentially. **Full gate (Finishing step 2):** `pnpm run check:local`.
- **Live verification runs from the loop worktree**, on its own ports — never against the primary's `:6020`/`:6021`, which serve the base checkout's code. Start it with `pnpm worktree:serve <server|developer>` (`--stop` before teardown; `--api-only` skips the processors). The worktree shares the primary's database: a plan that **adds a migration** must isolate first (`pnpm worktree:db isolate`, or `worktree:new <name> --own-db`). Details: [worktree-port-allocation.md](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/worktree-port-allocation.md).
- **Why push once:** [ci-cost.md](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/ci-cost.md).
- **Report the outcome once per run**, never per task (`COMPLETED` → `success`, `FAILED` → `error`, `CANCELLED` → `abandoned`):

  ```bash
  r="$(command -v skill-usage-outcome.cjs || echo "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/openthrottle/bin/skill-usage-outcome.cjs")"; if [ -f "$r" ]; then node "$r" --skill ot-loop --outcome success; fi
  ```
