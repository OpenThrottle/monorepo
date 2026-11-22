# Project runs

A **project run** runs a project's plans one after another, one draft PR each. It is a thin
sequencer over the existing plan-run queue: it never runs an agent itself. It enqueues one plan
through the same pipeline as the plan page's Run button (so each plan keeps its own runner, Ralph or
OT Loop, workspace and tuning). It waits for that plan's run to settle, then moves on. It is strictly
sequential and never runs two plans at once.

Start one from the project page (**Run project**), the `runProject` GraphQL mutation, or the MCP
`run_project` tool. Poll it through `Project.latestProjectRun` (MCP: `get_project`).

## Lifecycle

| Status        | Meaning                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------ |
| `QUEUED`      | Created; no plan enqueued yet (it moves on at once, inside `runProject`)                   |
| `IN_PROGRESS` | A plan is running; `currentPlan` names it                                                  |
| `COMPLETED`   | Every plan is done                                                                         |
| `STOPPED`     | A plan did not finish; `stoppedByPlan` and `stoppedReason` say which and why               |
| `CANCELLED`   | Someone cancelled it; the plan run it was waiting on was cancelled through the normal path |

`QUEUED` and `IN_PROGRESS` are active. A project has at most one active run (a partial unique index
on `project_runs`), so a second `runProject` is refused with `PROJECT_RUN_ACTIVE`.

State lives in `project_runs` (migration 194). Each plan run a project run enqueues carries
`plan_runs.project_run_id`, which is how the run tells its own plan runs from unrelated ones. A
server restart mid-run loses nothing.

## The rules

The plans are walked in `plans.project_sort_order` order. For each plan:

1. **COMPLETED, SKIPPED or CANCELED:** passed over.
2. **BLOCKED:** the run stops on it.
3. **This run already started a plan run for it:**
   - still `QUEUED`, `IN_PROGRESS` or `SCHEDULED`: wait.
   - `USAGE_LIMITED`: follow `resume_of_run_id` to the continuation and judge that. Continuations
     carry `project_run_id` too.
   - `COMPLETED` **with** a `pull_request` artifact on the work ledger: done, so move to the next plan.
   - `COMPLETED` without a PR, or `FAILED`, `CANCELLED`, `STALE`, `SKIPPED`, `MISSED` or `SUPERSEDED`:
     stop, naming the status (and the run's `settled_reason` when it has one).
4. **No run yet:** if the plan already has an active run this project run did not start, stop
   rather than double-run it. Otherwise enqueue it. If the enqueue is refused (for example, no
   runnable tasks), stop with the refusal as the reason.

When no plan is left, the run settles `COMPLETED`.

A COMPLETED run's PR artifact, and a usage-limited run's continuation, are written just after the
settle. So the step waits a **5-minute settle grace** before it treats either as missing.

**Resume** needs no special code. Call `runProject` again: finished plans are passed over, so the
new run starts at the plan that stopped it. Fix the stopping plan first (unblock it, add tasks, or
re-run it by hand), or it stops again.

## How it moves: one idempotent step

`ProjectRunAdvanceService.advance(projectRunId)`
(`applications/openthrottle-server/src/services/project-run-advance/`) reads the state and makes
exactly one move: enqueue the next plan, settle the run, or nothing. Every trigger calls the same
step, so calling it twice is harmless. Three layers keep concurrent callers from double-running a
plan:

- a Postgres advisory lock per project run (a second caller returns `busy`);
- guarded `project_runs` transitions (`UPDATE … WHERE status IN (active)`);
- a deterministic job id per (project run, plan), so a duplicate enqueue lands on the same BullMQ
  job and `plan_runs` row.

## Triggers and the reconcile sweep

The `Project Runs` BullMQ queue (`applications/openthrottle-server/src/queues/project-runs/`) runs
`advance`. Each path that settles a plan run with a `project_run_id` enqueues an advance job:

- the plans worker, after the settle and its ledger write;
- usage-limit handling;
- `settleCliPlanRun` and `forceSettlePlanRun`;
- both stale-sweep passes;
- the work-ledger verifier's PR merged/closed settle.

The enqueue is best-effort: a failed one never fails the settle.

The backstop is a **repeatable reconcile every minute**, which advances every active project run.
It covers a lost trigger, a server restart mid-run, and a plan-run cancel from the plan page (which
has no trigger of its own). `runProject` and `cancelProjectRun` call `advance` directly, so the
first plan enqueues, or the cancel lands, before the mutation returns.

## Tests

- Unit: `project-run-advance.service.test.ts` has one describe per rule above, plus the race.
- Lifecycle against a live database (opt-in): `project-run-advance.integration.test.ts` uses the
  real service, repositories and advisory lock. Only the enqueue and the plan-run cancel are faked.
  It covers order, passing over finished plans, stop and resume, cancel, COMPLETED without a PR,
  and the three-way race. Run it against a database whose server is stopped, because a live
  server's reconcile sweep would advance the test's runs too:

  ```bash
  POSTGRES_HOST=localhost OT_OPENTHROTTLE_DB_INTEGRATION=true \
    pnpm nx run openthrottle-server:test --skip-nx-cache \
    -- src/services/project-run-advance/project-run-advance.integration.test.ts
  ```
