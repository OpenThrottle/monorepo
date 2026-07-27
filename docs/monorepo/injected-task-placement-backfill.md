# Backfill: correcting plans with a pinned injected task

## Context

Before placement reconcile shipped, an `inject-task` rule (notably the GitHub
Commit rule) computed its task's `sort_order` **once**, at inject time. On a
`PLAN_CREATED` pass the plan was still empty, so the injected task landed first
and the apply-once ledger froze it there — later tasks stacked after it and
re-evaluation never moved it. See
[plan-task-tags-rules-design.md](./plan-task-tags-rules-design.md).

Placement is now a **continuously reconciled managed invariant**: every
evaluation pass re-establishes each injected task's placement against the
current task set (`InjectTaskExecutor.reconcile`). New and re-evaluated plans
self-correct. This runbook covers plans that were **already stuck** when the fix
deployed.

## Decision

Shipped baseline (no migration, no new API surface):

- **(a) Lazy correction on the next natural trigger.** Any task add, status
  change, or tag change already enqueues a rules-evaluation pass; the reconcile
  step repositions the stuck task on that pass. Most active plans fix themselves
  the next time they're touched.
- **(b) Per-plan manual re-eval.** The existing `evaluatePlanRules(planId)`
  mutation (`plans:write`) enqueues a full pass on demand — the per-plan escape
  hatch for a plan a user is looking at right now.

Optional, for proactively fixing visible plans without waiting:

- **(c) One-time guarded sweep** — enumerate non-terminal plans and call
  `evaluatePlanRules` for each (below). Not automated: it is a deliberate ops
  action.

We deliberately did **not** add an automated deploy-time sweep or a dedicated
`evaluateAllPlanRules` API. Reasons: (a)+(b) already cover the vast majority of
plans; a fleet-wide auto-sweep is a queue-stampede risk that would need its own
rollout controls; and reconcile is a no-op once a plan is in position, so the
cost of waiting for a natural trigger is zero correctness risk (only a delay).

## Why the sweep is safe (idempotent, no stampede)

- **Per-plan job dedup.** `enqueueEvaluation` adds each pass with
  `deduplication: { id: 'plan:<planId>', keepLastIfActive: true }`, so at most
  one active + one waiting pass exists per plan. Re-running the sweep, or a
  natural trigger racing it, collapses into a single pass — no duplicate work,
  no `UNIQUE(plan_id, sort_order)` errors.
- **No-op when converged.** Reconcile writes nothing when the injected task is
  already in position, so a sweep over already-correct plans is cheap and
  produces no `updated_at` churn or spurious subscription emits.
- **Kill switch.** If a sweep misbehaves, set
  `PLAN_RULES_RECONCILE_PLACEMENT_ENABLED=false` to freeze reconcile (injected
  tasks stay at their current position) without a code revert.

## Runbook: one-time sweep (option c)

Run against the target environment's GraphQL API with a `plans:write` token.
Enumerate the non-terminal plans, then enqueue a pass per plan. Terminal plans
(`COMPLETED`, `CANCELED`) are skipped — their task placement no longer matters.

1. List non-terminal plans (repeat per non-terminal status, paging as needed):

   ```graphql
   query PlansToSweep($status: String!) {
     plansByStatus(input: { status: $status }) {
       plans {
         id
         status
       }
     }
   }
   ```

   Statuses to include: everything except `COMPLETED` and `CANCELED` (e.g.
   `PENDING`, `IN_PROGRESS`, `QUEUED`, `BACKLOG`, `BLOCKED`).

2. For each collected plan id, enqueue a pass (dedup makes this safe to batch):

   ```graphql
   mutation Sweep($planId: ID!) {
     evaluatePlanRules(planId: $planId) {
       enqueued
       planId
     }
   }
   ```

   Throttle to a steady rate (e.g. a small concurrency limit) so the calls don't
   spike the API; the queue itself coalesces duplicates regardless.

3. Verify a spot-check plan: its injected task (e.g. GitHub Commit) should now
   sit in its configured slot (last, for the commit rule) and stay there as
   tasks are added.

Re-running the whole sequence is safe and idempotent.
