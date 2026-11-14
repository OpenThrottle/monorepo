---
# Claude Code reads argument-hint and arguments for slash-command argument substitution (`$planId` in the body).
argument-hint: <planId>
arguments:
  planId: string
description: >-
  Drive one OpenThrottle plan to a PR with the built-in /loop, a task at a time
  in an isolated worktree. USE WHEN the user runs /ot-loop <planId>, says
  "loop over plan <id>", or wants a plan executed autonomously. Not for authoring
  plans (ot-plans) or the headless Ralph runner (agents-ralph).
metadata:
  author: openthrottle
  last-reviewed: '2026-11-14'
  version: '1.1.0'
name: ot-loop
---

Important: `$planId` is the first (and only) argument passed to this prompt. If that value does not map back to an OpenThrottle Plan or Task ID, throw an error immediately!

Your job is to run the built-in **`/loop`** over OpenThrottle plan **`$planId`** and its tasks — executing one task at a time, keeping status in OT in sync, appending progress to the plan output stream as you go, and opening a PR when the plan is done. This is **Ralph driven interactively via `/loop`** rather than the workflow CLI: the loop is the outer driver, but the per-task discipline is identical to the `agents-ralph` skill.

## Setup (once, before the loop)

A session started from a kickoff brief (`/ot-loop <planUuid>` on line 1 — [`ot-plans` § Follow-ups and session kickoff](https://github.com/openthrottle/monorepo/blob/main/skills/ot-plans/SKILL.md#follow-ups-and-session-kickoff)) begins here, at step 1, like any other run.

1. **Work in an isolated worktree on a feature branch**, never on the base checkout. Creating, healing and removing worktrees is the `ot-worktree` skill's job — use it for **every** worktree interaction in this loop, never a bare `git worktree` command. Follow that skill for how to invoke create / heal / destroy; a bare `git worktree add` skips the repo's provisioner (ports, `.env`, compose isolation), and a bare `git worktree remove` skips the teardown hook and the safety checks.

   Name it for the plan (e.g. `feat/openthrottle-drivers`, `ot/cli-allow-list`); rename the generated branch with `git branch -m` if you want a different prefix.

   Two things to check before you start work:

   - **The worktree branches off whatever the base checkout has checked out**, not `main`. Confirm the base checkout is on the branch you intend to build from first, or fix it after with `git reset --hard origin/main`.
   - **Where it lands is not fixed** (`OPENTHROTTLE_WORKTREE_ROOT` env → the repo's `.env` → `~/.openthrottle/worktrees`, plus `<org>/<repo>`). Use the path create prints.

2. **Load the plan and tasks** — `get_plan(planId)` + `get_tasks_by_plan_id(planId)` (or `get_remaining_tasks_for_plan`). Canonical order is `sortOrder ASC, createdAt ASC`. If tasks are out of sequence, fix with `reorder_plan_tasks` (never delete-and-recreate).
3. **Set the plan `IN_PROGRESS`** via `update_plan(planId, { status: 'IN_PROGRESS' })` if it isn't already.
4. **Open a run row so this run is attributable** — `register_plan_run({ planId, model, branch })`.

   - **Declare the `model` you are actually running as.** If you cannot determine it, pass null rather than a plausible guess — a wrong value in a provenance column is worse than a missing one, because nothing downstream can tell it is wrong. Null is a legible answer.
   - **Do not declare `executionBackend`.** The MCP detects it from the harness that launched it. Pass one only if the tool tells you detection found nothing.
   - **Capture the returned run id** and carry it as loop state for the rest of the run. You need it to settle.
   - **Best-effort**: if register fails, say so and keep working; never block real work on telemetry.

   Then, once the worktree exists, `register_plan_run_worktree_checkout({ planRunId, filesystemPath })` with the path create printed, so `checkout_id` resolves. That is what makes "open in editor" work for this run and what lets the worktree read as busy while you are in it. It soft-fails harmlessly if the path is not a linked worktree.

5. **A fresh worktree needs codegen before app tests will collect** — run `pnpm nx run-many --target=codegen-graphql --all` if the `__generated__` output is missing.
6. **Live verification runs from the loop worktree**, on its own ports — never against the primary's `:6020`/`:6021`, which serve the base checkout's code. Start the stack with `pnpm worktree:serve <server|developer>` (it waits for the port, prints a probe and stops with `--stop` — do that before teardown; `--api-only` skips the processors). The worktree shares the primary's database by default. A plan that **adds a migration** must isolate first (`pnpm worktree:db isolate`, or create with `worktree:new <name> --own-db`): in shared mode `database:migrate` and the `dev` gate refuse a migration absent from `origin/main`. Details: [worktree-port-allocation.md](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/worktree-port-allocation.md).

## The loop (one task at a time)

> **This section is the canonical statement of the per-task discipline.** Two deliberate
> restatements change with it, in the same PR: the `agents-ralph` skill (a
> standalone prompt for the Ralph runner) and the OT Loop job, its headless implementation in code
> (`packages/openthrottle-agentic-loop`; [design](https://github.com/openthrottle/monorepo/blob/main/docs/workflows/ot-loop-job.md), whose § 9
> names its one exception). Everything else links here.

Each `/loop` iteration works exactly one task. Resume the lowest-`sortOrder` `IN_PROGRESS` task first; otherwise pick the lowest `sortOrder` `PENDING`/`QUEUED`.

> **Invariant — at most ONE task `IN_PROGRESS` at a time.** Steps 1→5 are one atomic unit: never run step 1 (`IN_PROGRESS`) for a task while another task is still `IN_PROGRESS`. Even when you power through several tasks in a single turn, fully close the current one — through **step 4 (`COMPLETED`)** — _before_ you start the next. Dropping the step-4 flip strands the task `IN_PROGRESS` with no server-side reconcile. **This is the most common failure of this loop** — two tasks `IN_PROGRESS` means you skipped a step 4.

1. **Start:** `update_task(taskId, { status: 'IN_PROGRESS' })`, then `begin_task_session({ planId, taskId, model })` to open a work session scoped to this task carrying the model that will do its work. (Precondition: no other task is `IN_PROGRESS` — see the invariant above.) Where `model` comes from is [§ Model routing](#model-routing); declare what will actually do the work, and omit it rather than guess — a session's model is fixed when it opens and cannot be corrected later.
2. **Do the work** for that task, following the repo's rules (generators first, code style, no deep imports, etc.). Do it yourself, or hand it to a subagent on the routed model — [§ Model routing](#model-routing). **This is the only step that may be delegated.**
   - **Claim the inbox before any destructive step** (delete, migrate, rewrite history, push) **and on both sides of a delegation** — [§ Mid-task claims](#mid-task-claims).
3. **Validate** before completing — at minimum `pnpm nx affected --target=lint,typecheck,test` for the touched projects (run targets **sequentially**, not in parallel — they share the Nx cache). Don't mark a task done on red.
4. **Complete — do this BEFORE starting any other task:** `update_task(taskId, { status: 'COMPLETED' })`. If the task genuinely can't be finished, set `BLOCKED` or `SKIPPED` instead — but never leave it `IN_PROGRESS` while you move on. Committing the work (step 5) is **not** a substitute for this flip. **On the plan's last open task, do step 6 first.**
5. **Commit per task** with `/github-commit` — conventional commit, with `Plan-Id:` and `Task-Id:` footers for traceability. Do **not** record a work-ledger artifact for these per-task work commits; the footers carry the traceability. A task that changes no tracked file (verification-only, gitignored output like `/skill-sync`, OT-only) needs **no** commit — never make an empty or cosmetic one to carry the footer. Its step-4 `COMPLETED` flip is the record; the squash picks it up from OT (`github-squash` § Footers).
   - **💰 Commit per task, but do NOT push per task.** Let the commits accumulate locally and push **once**, when the plan is done (the PR step below does it). Every push to a branch with a ready PR triggers a full CI run, so pushing per task burns N runs validating a branch nobody is reviewing yet. One run at the end validates the whole batch — the same total validation over fewer runs. Push mid-plan only if you must hand off, exit, or the worktree is at risk of being reaped. See [ci-cost.md](https://github.com/openthrottle/monorepo/blob/main/docs/monorepo/ci-cost.md).
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

### The delegation prompt must stand alone

A subagent inherits none of your context: build its prompt from the task row alone (title,
`description` verbatim, `requirementsJson` as acceptance criteria, the repo rules, and "do NOT change
OT status and do NOT commit"). Template: [references/model-routing.md](./references/model-routing.md).
A row too thin to delegate from is a signal about the row: do the task in the parent turn.

## Intra-task fan-out

Step 2 may be worked by several agents in parallel; nothing else changes (one task `IN_PROGRESS`,
the parent owns flips, validation and the single commit). Eligible only when the work splits into
units with **disjoint file sets** and no shared invariant coupling them; otherwise the parent does
step 2 itself. Fan-out agents never mutate OT, commit, push or run any `nx` target (concurrent
targets contend on the shared `.nx` cache); the parent validates sequentially after they rejoin.
Cheap-tier fan-out is capped at 4 agents at once, non-default tier at 1. Read
[references/fan-out.md](./references/fan-out.md) before fanning out.

## Your run row

Everything here is specific to running interactively. It is deliberately outside the canonical
block above, because the detached `workflow-ralph` CLI already does all of it — it heartbeats on
a timer and polls the cancel marker itself. Only an agent turn has to do it by hand. The one
exception is the inbox claim: no CLI does it, so the `agents-ralph`
prompt carries the same step for the agent under `workflow-ralph`.

**Poll for a cancel at each task boundary.** Call `get_plan_runs(planId)` and check your run's
`cancelRequestedAt`. If it is set, stop where you are and settle `CANCELLED`.

> **This is the only way a Kill reaches you.** The server deliberately cannot stop an interactive
> run: it has no iteration loop to interrupt, so cancelling one returns `CANCELLATION_REQUESTED`
> and leaves the plan alone rather than resetting it underneath you. That safety floor is exactly
> what makes the poll your responsibility. An unpolled cancel is a cancel that silently does
> nothing — the user pressed the button and nothing happened.

Missing a poll only delays a cancel; it corrupts nothing. Best-effort is fine, silence is not.

**Then claim the inbox, at the same boundary.** Right after the cancel poll comes back clear, call
`claim_plan_messages({ planId, planRunId, taskId })` for the task you are about to start, before
its step 1 — once per boundary, because claiming is delivery. Beyond the tool's own contract:

- A `STEER` can redirect the run, not just the task: "skip the UI task" means `SKIPPED` plus a
  note; "stop after this one" means finishing the current task and settling `CANCELLED`.
- A `QUEUE` that belongs to a later task becomes a `create_tasks` entry or a note on that task.
- Acknowledge each message in `append_plan_output` with the task's `taskId`: what changed, or why
  you could not honor it. The human is waiting to see that it landed.

An empty result is the common case. A failed claim, like a missed poll, only delays delivery — log
it and keep going.

### Mid-task claims

A boundary claim reaches a mid-task `STEER` only after the task commits — after the step it
questioned. So step 2 also claims, passing the **in-flight** `taskId`, right before:

- deleting files or directories (`rm`, `git rm`, `git clean`, `worktree:remove`);
- a migration or a write to a shared database;
- a history rewrite (`reset --hard`, `rebase`, `--amend`, `branch -D`, squash) or a push;
- handing step 2 to a subagent, and again after collecting its result, before keeping it.

Ordinary edits are not claim points. Subagents never claim; the parent claims around them.

A mid-task `STEER` leaves the task the one `IN_PROGRESS` task. It can **pause** (skip the step,
re-plan, carry on — the default), **redirect** (change how this task is done; one about another task
becomes a note or a `create_tasks` entry), or **abort** (skip the step, set the task `BLOCKED` with
the `STEER` in `summary`, then continue or settle `CANCELLED`). Acknowledge it in `append_plan_output`
with the in-flight `taskId`.

Under Claude Code the `plan-inbox-claim` PreToolUse hook is a throttled backstop: during a
registered run it claims before destructive `Bash` and `Agent` calls and denies once on a `STEER`.
Other harnesses depend on the claim points above.

> **Invariant — every exit path settles the run.** `settle_plan_run(planRunId, status)` with
> `COMPLETED` when the PR opens, `CANCELLED` on a deliberate stop, `FAILED` when you give up or
> hit something you cannot finish. On the `COMPLETED` path also pass `headSha` and `prNumber` —
> that call is what puts the work on the ledger. They are optional precisely so the other two
> paths, which have no PR, stay valid. A row opened and never settled sits `IN_PROGRESS` forever,
> reads as live, and holds its worktree marked busy. Settling twice is a safe no-op, so settle when in doubt.

### What catches you if you don't

Three backstops (settle-on-next-register, the Claude Code `Stop` hook, the server age sweep) settle
an abandoned run to `STALE` — damage control for a hard crash, never a substitute for step 6. Latency
and harness coverage: [references/backstops.md](./references/backstops.md).

## Finishing

1. **Close the plan with a three-way status check.** Re-fetch `get_tasks_by_plan_id(planId)` (or `get_remaining_tasks_for_plan`), then decide:
   - **Any task is `IN_PROGRESS`, `PENDING`, or `QUEUED`:** fix that task first — flip it to `COMPLETED` / `BLOCKED` / `SKIPPED` as appropriate (`PROMOTED` also counts as resolved). A committed task left `IN_PROGRESS` is the usual culprit (see the loop invariant). Do not set the plan status yet.
   - **Else any task is `BLOCKED`:** `update_plan(planId, { status: 'BLOCKED' })`. A run that can make no further progress ends the plan `BLOCKED`, still opens the draft PR listing what is blocked (step 5), settles the run `COMPLETED` (step 6), and leaves the PR in draft; a human unblocks and re-enqueues it.
   - **Else** (every task is `COMPLETED` / `SKIPPED` / `CANCELED` / `PROMOTED`, or the plan has zero tasks): `update_plan(planId, { status: 'COMPLETED' })`.

   The server refuses `COMPLETED` while any task is unresolved (`BLOCKED` / `IN_PROGRESS` / `PENDING` / `QUEUED`). A refusal means take the `BLOCKED` branch (or fix open work), not retry `COMPLETED`. This re-fetch is mandatory — never skip it.

2. Before continuing ensure `pnpm run check:local` passes (it runs affected lint, typecheck and test plus the repo gates), flagging any errors we encounter
3. To minimize friction merging with main we will run `/github-squash` to condense our PR to a single commit — its `Task-Id:` footers come from OT, so commitless tasks are carried too
4. Next we will fetch main `git fetch origin main:main` and rebase the branch against `main`
5. **Open a Draft PR** with `/github-pull-request` (conventional-commit title, the repo PR template, testing steps phrased as things to do) — this is the single push for the whole plan. Leave it in **draft**: `build` skips on draft PRs, so a draft is what keeps any later push cheap. Mark it ready (`gh pr ready`) only when the work is genuinely up for review. **Capture the PR URL and number, and the branch head sha** — the PR is the precondition for teardown below, and step 6 records both.
6. **Settle your run row, with the sha and the PR number** — `settle_plan_run(planRunId, 'COMPLETED', headSha, prNumber)`. The PR is open, so the run is genuinely done, and nothing else will ever close this row. Those two values are also how the work gets onto the ledger: the server writes the artifacts itself from them. Pass them here and there is nothing to do after the merge — see [Recording the work on the ledger](#recording-the-work-on-the-ledger).

   Then report the outcome **once per run, never per task** (`COMPLETED` → `success`, `FAILED` → `error`, `CANCELLED` → `abandoned`; same on every exit path):

   ```bash
   r="$(git rev-parse --show-toplevel)/.claude/hooks/skill-usage-outcome.cjs"; if [ -f "$r" ]; then node "$r" --skill ot-loop --outcome success; fi
   ```

7. **Stop the loop** once the PR is open. Do **not** merge.

## Teardown the worktree (only after a successful PR)

Once — and **only** once — the PR is confirmed open and `git status` in the worktree shows nothing
uncommitted or unpushed, tear down the isolated worktree by following
[`references/teardown.md`](./references/teardown.md). If PR creation failed or anything is
unpushed, **do not tear down**: leave the worktree intact, settle your run row `FAILED`, and report.

## Recording the work on the ledger

The `ot-plans` skill § Work ledger owns this. Your part: pass `headSha` and `prNumber` to
`settle_plan_run` on `COMPLETED`; the server records the artifacts, and there is no post-merge step.
`gh pr merge --auto` only enqueues on a merge queue, so do not read a landed sha until
`gh pr view <n> --json mergedAt,mergeCommit` shows one.

## Rules

- **One task `IN_PROGRESS` at a time.** Flip it to `COMPLETED` (or `BLOCKED`/`SKIPPED`) before starting the next. Committing the work is not the same as flipping the status.
