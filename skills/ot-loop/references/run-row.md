# Your run row

Loaded from [`ot-loop`](../SKILL.md) § Setup step 5 and § Your run row. Read it once before the
first task.

Everything here is specific to running interactively. The headless OT Loop job heartbeats on a
timer and polls the cancel marker itself; only an agent turn has to do it by hand.

## Registering

`register_plan_run({ planId, model, branch })`:

- **Declare the `model` you are actually running as.** If you cannot determine it, pass null rather
  than a plausible guess. A wrong value in a provenance column is worse than a missing one, because
  nothing downstream can tell it is wrong.
- **Do not declare `driver`.** The MCP detects it from the harness that launched it. Pass
  one only if the tool tells you detection found nothing.
- **Capture the returned run id** and carry it for the rest of the run.
- **Best-effort**: if register fails, say so and keep working; never block real work on telemetry.

Then, once the worktree exists, `register_plan_run_worktree_checkout({ planRunId, filesystemPath })`
with the path create printed, so `checkout_id` resolves. That makes "open in editor" work for this
run and lets the worktree read as busy while you are in it. It soft-fails harmlessly if the path is
not a linked worktree. A no-files run has no worktree and skips this call.

## Cancel poll

At each task boundary, `get_plan_runs(planId)` and check your run's `cancelRequestedAt`. If set,
stop where you are and settle `CANCELLED`. The server deliberately cannot stop an interactive run:
it has no iteration loop to interrupt, so cancelling one returns `CANCELLATION_REQUESTED` and leaves
the plan alone. That safety floor is what makes the poll your responsibility. Missing a poll only
delays a cancel; it corrupts nothing.

## Inbox claims at a boundary

Right after the cancel poll comes back clear, `claim_plan_messages({ planId, planRunId, taskId })`
for the task you are about to start, before its step 1 — once per boundary, because claiming is
delivery.

- A `STEER` can redirect the run, not just the task: "skip the UI task" means `SKIPPED` plus a note;
  "stop after this one" means finishing the current task and settling `CANCELLED`.
- A `QUEUE` that belongs to a later task becomes a `create_tasks` entry or a note on that task.
- Acknowledge each message in `append_plan_output` with the task's `taskId`: what changed, or why
  you could not honor it.

An empty result is the common case. A failed claim only delays delivery — log it and keep going.

## Mid-task claims

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
the `STEER` in `summary`, then continue or settle `CANCELLED`). Acknowledge it in
`append_plan_output` with the in-flight `taskId`.

Under Claude Code the `plan-inbox-claim` PreToolUse hook is a throttled backstop: during a
registered run it claims before destructive `Bash` and `Agent` calls and denies once on a `STEER`.
Other harnesses depend on the claim points above.
