# Work-ledger sessions: what a session is, and why history has no durations

`work_sessions` is the work ledger's spine — migration 068 calls it "one row per unit of work … with lifecycle timestamps". This doc records what a session actually means, because for a long stretch the table did not mean that at all, and the way it failed is easy to reintroduce.

If you are about to add a caller that writes to the ledger, read [Attributing a mutation](#attributing-a-mutation-to-an-open-session) first.
If you are about to write a plan or task `status` column from anywhere, read [Which status writes reach the ledger](#which-status-writes-reach-the-ledger) — that one has a test that will stop you.

---

## ⚠️ The failure this documents

Pointed at a week of real, heavy use, the ledger looked like this:

|                                            |         |
| ------------------------------------------ | ------- |
| `work_sessions` in 7 days                  | 436     |
| of which instant (`ended_at = started_at`) | **435** |
| with a real duration                       | **1**   |

Every duration, concurrency and utilisation view inherits that emptiness. The `/timeline` route rendered 447 spans of which 446 carried no duration, and sub-row overlap stacking — the feature the view exists for — could not be demonstrated against real data under any grouping mode.

**Nothing was broken in a way anything could detect.** Every mutation succeeded. A session row was written every time. Only the _shape_ of the ledger was wrong, and no test, type or constraint has an opinion about shape.

### What actually caused it

Not what it looked like. The obvious reading — "agents open and close a session per MCP call" — was false. `packages/openthrottle-mcp/src/session/current-session.ts` has always held **one long-lived session per connection**, opened lazily and cached for the life of the process.

The server's capture path (`WorkLedgerCaptureService.resolveSession`) attributes a `status_change` to an ambient session when the request carries `X-OT-Session-Id`, and otherwise opens a fresh instant session. Only the work-ledger tools ever sent that header. `tools/tasks.ts` and `tools/plans.ts` did not.

So the MCP held a perfectly good open session and then made every `update_task` and `update_plan` call without mentioning it. Each one fell through to the instant branch. The session existed the whole time; nothing told the server about it.

The lesson worth keeping: **the span was lost in the gap between two components that each worked correctly.** The session was real, the capture path was correct, and the header contract was honoured — by a different module than the one making the calls.

---

## Attributing a mutation to an open session

A mutating tool call must carry the connection's ambient session:

```ts
import { ambientSessionOptions } from '../session/session-headers.ts';

const result = await executeGraphqlWithAuth(
  token,
  UpdateTaskDocument,
  { input },
  await ambientSessionOptions(token),
);
```

`ambientSessionOptions` reuses the open session and opens one on first use, so the mutations of a single agent run group under a single span.

Two rules that are not obvious from the call site:

- **Reads never attach it.** A query must not manufacture a session. A session that exists only because something was read is not a unit of work, and counting one is how you get a ledger full of rows that mean nothing.
- **Opening is best-effort.** If the session cannot be opened the mutation proceeds unattributed. Ledger attribution is layered on the caller's actual work and must never be the reason that work fails.

---

## `closed_by`: three values, because two could not tell the story

| value      | meaning                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| `explicit` | Closed by `endWorkSession` after real work. The session records a span.         |
| `instant`  | Instantaneous by nature — a single first-party mutation with no span to record. |
| `sweeper`  | Abandoned past the 24h TTL and closed by the sweeper.                           |

Migration 068 shipped only `explicit` and `sweeper`, folding instant sessions into `explicit`. That left `ended_at = started_at` as the **only** way to tell the two apart — and that arithmetic identity is precisely what let the failure above hide in plain sight for a week. 435 rows said `explicit` while meaning something else entirely.

A value that has to be inferred from a timestamp comparison is not a value the data carries. Migration 113 widened the CHECK so it is.

---

## 🚫 History is deliberately not backfilled

**Do not write durations onto historical sessions.** This is a decision, not an oversight, and it has been reached deliberately more than once.

The 435 zero-duration rows are a _faithful record_ of a period when the span was never captured. Any `ended_at` invented for them would be a guess dressed as a record — indistinguishable, later, from a genuine measurement. Worse, backfilling erases the only evidence of when the ledger started being correct, which is exactly the boundary anyone analysing this data needs to see.

The same applies to `closed_by`: rows written before migration 113 keep `explicit` even where they were plainly instant. New rows carry the new value; history stays as it was written.

If a query needs "sessions with a trustworthy span", the honest filter is on `closed_by` plus a start date — not a rewrite of the past.

---

## Which status writes reach the ledger

A `status_change` artifact is the only durable record that a plan or task moved. Exactly one method writes one — `WorkLedgerCaptureService.recordStatusChange`, in the same transaction as the row update. Every other write to a `status` column records nothing, and for most of them that is correct.

For months it was not. Plan-level artifacts were written for `IN_PROGRESS` and almost never for `COMPLETED`:

|                      | plans with the artifact |
| -------------------- | ----------------------- |
| plan → `IN_PROGRESS` | 88.7%                   |
| plan → `COMPLETED`   | **9.8%**                |

The cause was not `setPlanStatus`, which is where everyone looked. Most plan completions are performed by `TasksService.completeParentPlanIfTasksDone` — a guarded `UPDATE` fired as a side effect of `updateTask` when a plan's last non-terminal task completes. 297 of the 300 missing-artifact plans carry its timing signature (+6ms to +74ms after the task commit). The orchestrator's later `updatePlan(status: COMPLETED)` then finds the plan already `COMPLETED` and correctly records nothing.

**Nothing connected "the status column changed" to "a ledger row exists."** Tests asserted on one side of that gap or the other, so a write path that skipped capture broke no test — the same shape of failure as the zero-duration sessions above.

### Captured

| write path                                            | transition           | where the artifact is written                      |
| ----------------------------------------------------- | -------------------- | -------------------------------------------------- |
| `PlansResolver.updatePlan`                            | plan, any            | in place                                           |
| `TasksResolver.updateTask`                            | task, any            | in place                                           |
| `PlanStatusService.setStatus`                         | plan, any            | in place                                           |
| `TasksService.syncParentPlanStatus`                   | plan → `IN_PROGRESS` | `TasksResolver.captureParentPlanReconcile`         |
| `TasksService.completeParentPlanIfTasksDone`          | plan → `COMPLETED`   | `TasksResolver.captureParentPlanReconcile`         |
| `recordPlanBlockedTransition` (`beforeAll` job hooks) | plan → `BLOCKED`     | in place                                           |
| `TaskPromotionService.closeOutSourceTask`             | task → `SKIPPED`     | in place                                           |
| `RuleApplicationsService.orphanUnmatchedApplications` | task → `SKIPPED`     | `PlanRulesProcessor.captureOrphanedTaskSoftCloses` |

Two structural rules came out of wiring those up, and both are load-bearing:

- **`nestjs-repositories` never depends on `WorkLedgerCaptureService`.** A repository helper that moves a status returns the transition it performed and accepts the caller's `EntityManager`; the resolver or processor owns the capture. That is why `syncParentPlanStatus` and `completeParentPlanIfTasksDone` are captured somewhere other than where they write.
- **A worker-tier module provides `WorkLedgerCaptureService` directly, alongside `GlobalClsModule`** — never by importing the API-tier `WorkLedgerGraphqlModule`. A queue processor has no request principal, so it resolves its own actor with `WorkLedgerRunService.resolveActorServiceAccountId()`.

### Deliberately not captured

The criterion, stated so it decides a path that does not exist yet:

> A write that moves a plan or task **back toward a working or restartable state** (`PENDING`, `QUEUED`, `IN_PROGRESS`) as a side effect of a retry, cancellation, stale-run reclaim or boot-time reconcile records nothing. It asserts something about **scheduling**, not about the work. Several of them also run at boot or from a worker with no resolvable principal, so capturing them would mean inventing an actor — see the backfill section below for why that is the worse failure.

| write path                                               | transition                                           |
| -------------------------------------------------------- | ---------------------------------------------------- |
| `PlanStatusService.cancelRun`                            | plan → `PENDING`, its `QUEUED` tasks → `PENDING`     |
| `PlanEnqueueService.commitEnqueueTransaction`            | plan → `QUEUED`; un-terminals tasks back to `QUEUED` |
| `PlansProcessor.reconcilePlanStatusOnStartup`            | stranded `IN_PROGRESS` → `QUEUED`                    |
| `PlansProcessor.reconcilePlansQueuedWithInProgressTasks` | `QUEUED` → `IN_PROGRESS` at boot                     |
| `PlansProcessor.resetPlanStatusToQueued`                 | `IN_PROGRESS` → `QUEUED` on job failure or stall     |
| `PlansProcessor.process` (plan-run start)                | plan → `IN_PROGRESS`                                 |
| `PlanRunsStaleSweepProcessor.reconcileStrandedPlan`      | `IN_PROGRESS` → `PENDING`                            |
| `InjectTaskExecutor.reinject` (orphan revive)            | task `SKIPPED` → `PENDING`                           |

The plan-run start is the one worth explaining, because it is a forward move: the run's own session carries the plan as an attached subject, so the "being worked on" fact is already in the ledger with better provenance than a status artifact would have.

The revive is the other one. Note the asymmetry, which is correct rather than an oversight: the rule-injected task's soft-close to `SKIPPED` **is** captured, while `reinject` reopening that same task is not. The close is an outcome; the reopen is the scheduler undoing itself.

Two more paths record nothing, for reasons that are not a judgement call at all:

- **Idempotent no-op early returns.** No transition happened, so there is no fact.
- **Insert-time initial status** on plan or task creation. There is no `from`, so there is nothing a `status_change` could say.

### The guard

`applications/openthrottle-server/src/graphql/work-ledger/status-write-capture-coverage.test.ts` is a drift gate over both tables. It rediscovers every function that writes a `status` column — in `openthrottle-server` and `nestjs-repositories` — from source on each run, and fails on any it has not been told about. Adding a new write path therefore costs a registry entry with a disposition and a written reason, which is the whole point: the decision gets made rather than defaulted.

It is deliberately not a list of today's call sites. A list passes forever once someone adds the next path, which is exactly how the original gap survived. The gate also checks each `captured` claim against the code, by looking for the `recordStatusChange` call inside the function named as that write's capture site — so deleting a capture turns the gate red on its own, without relying on a behavioural test happening to cover that path.

Because the same helper can be captured from one caller and deliberately uncaptured from another — `syncParentPlanStatus` is captured from the resolvers and not from the boot reconcile — the gate registers the **callers** of those helpers too.

---

## 🚫 The missing COMPLETED artifacts are not backfilled either

The fix above is forward-only. The plans that completed without an artifact keep no artifact, and this is the same decision as the durations above, reached for the same reason a second time.

The transition is knowable — `plans.completed_at` says roughly when, and the plan is `COMPLETED` now. **The actor and the session are not.** Nothing recorded which user or service account completed those plans, or which run they belonged to; the whole point of `completeParentPlanIfTasksDone` being a side effect is that it left no trace of who triggered it. Writing a plausible actor would produce a row indistinguishable from a real capture, and nothing downstream could tell it was invented.

That is the provenance failure mode plan `d8b857c0` rejected for `model` and plan `f3bce00e` rejected for run outcomes: **inventing a plausible value for a provenance column is worse than leaving it null**, because a null announces itself and a guess does not.

A backfill that asserts **only what is knowable** — the transition happened, at `completed_at`, actor unknown — remains arguable. It is not folded in here. If anyone wants it, it belongs in its own plan with that constraint stated up front, so the "actor unknown" part is a reviewed decision and not a detail that erodes during implementation.

Until then, the honest filter for "plans whose completion is recorded" is a join to the artifact plus a start date, the same shape as the session filter above.

---

## The capture-era boundary: 2026-07-14 05:30:00 UTC

Capture did not exist before commit `9aad20c2` (#186, "work ledger — sessions + typed artifacts"). Plans that completed before that are **structurally guaranteed** to have zero artifacts. Any coverage rate measured against an all-time denominator is blended across the two eras and means nothing.

The worked example, from the investigation that found the gap:

|                                               |           |
| --------------------------------------------- | --------- |
| `COMPLETED` plans, all time                   | 926       |
| with a `status_change` artifact               | 33 (3.6%) |
| of those 926, completed **before** `9aad20c2` | 590       |
| capture-era `COMPLETED` plans                 | 336       |
| capture-era rate                              | **9.8%**  |

The headline 3.6% was wrong by a factor of nearly three, and wrong in the direction that makes the bug look worse and the fix look more dramatic than it was. Split on the boundary before quoting any ledger coverage number.

---

## ⚠️ Measuring a transition by current status undercounts it

Worth its own heading because it produced a false reading inside the plan that documented it.

**A row that transitioned onward no longer shows the status you are counting.** Counting tasks currently `SKIPPED` to size the impact of a soft-close path reported _zero observed impact_ — because the tasks that were soft-closed had since been revived, re-injected or completed, and had moved off `SKIPPED`. Measuring the same thing against the `rule_applications` ledger, which records the event rather than the end state, corrected it to 5.

Splitting on `created_at ≠ updated_at` does **not** fix this. That distinguishes a row created in place from one that was later modified; it says nothing about which statuses a modified row passed through. Nothing in `plans` or `tasks` does — that is what the artifact is for.

So: **to count transitions, query the thing that records transitions.** If no ledger row exists for the transition you care about, the honest answer is that it was never measured, not a number derived from current status.

---

## Related

- `databases/migrations/068_create_work_ledger_tables.sql` — the original schema and its comments.
- `databases/migrations/113_add_instant_to_work_sessions_closed_by.sql` — the `instant` value.
- `packages/openthrottle-mcp/src/session/session-headers.ts` — ambient session propagation.
- `applications/openthrottle-server/src/graphql/work-ledger/work-ledger-capture.service.ts` — the server-side capture path.
- `applications/openthrottle-server/src/graphql/work-ledger/status-write-capture-coverage.test.ts` — the drift gate over every status write, and the registry of what each one does about the ledger.
- `applications/openthrottle-server/src/graphql/work-ledger/artifact-type-registry.ts` — the `status_change` payload and external key.

> **Note:** several files reference a `docs/monorepo/work-ledger-design.md` (with §-numbered sections) that is not present in this repo. Those references are dangling; this document does not attempt to reconstruct it.
