/**
 * @description What the boot reconcile does with a SCHEDULED run whose delayed job is gone: put the
 * job back (`enqueue`, delayed by the time still left — 0 when it is already due) or settle the run
 * (`missed`, with a human-readable reason that is shown to the user).
 */
export type ScheduledPlanRunReprojectDecision =
  | { readonly delayMs: number; readonly kind: 'enqueue' }
  | { readonly kind: 'missed'; readonly reason: string };

/**
 * @description What becomes of a scheduled run when its delayed job fires. Only `fire` starts it;
 * every other kind settles the run without a side effect on the plan or its tasks:
 * - `missed` → MISSED: it is {@link SCHEDULED_PLAN_RUN_GRACE_MS} or more past `scheduled_for`.
 * - `superseded` → SUPERSEDED: the plan already has an active run; starting would double-run it.
 * - `nothing_to_run` → COMPLETED: the plan has no task a run could pick up, so there is no work to
 *   start (and no reason to flip a finished plan back to QUEUED).
 * - `workspace_missing` → FAILED: the working directory resolved at schedule time is gone (its
 *   worktree was removed, or its checkout pruned, while the run waited), so the run cannot start.
 * `reason` is human-readable and shown to the user.
 */
export type ScheduledPlanRunFireDecision =
  | { readonly kind: 'fire' }
  | { readonly kind: 'missed'; readonly reason: string }
  | { readonly kind: 'nothing_to_run'; readonly reason: string }
  | { readonly kind: 'superseded'; readonly reason: string }
  | { readonly kind: 'workspace_missing'; readonly reason: string };
