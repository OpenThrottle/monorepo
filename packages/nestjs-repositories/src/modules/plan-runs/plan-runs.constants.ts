/**
 * @description Shared constants for plan-run liveness (heartbeat) and staleness detection.
 * @public
 */

/**
 * How often the owning run process (detached CLI loop or in-server worker) bumps
 * its `last_heartbeat_at`. The CLI mirrors this value with its OWN local constant
 * (tools/workflows must not import from this server package); keep the two in sync.
 */
export const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * An IN_PROGRESS run whose heartbeat (or, absent one, created_at) is older than this
 * cutoff is treated as dead by the reader and settled by the sweeper. MUST stay
 * comfortably greater than {@link HEARTBEAT_INTERVAL_MS} (here K ≈ 8) so a GC pause or
 * brief network blip on a live run does not trip a false-positive stale verdict.
 */
export const STALE_CUTOFF_MS = 120_000;

/**
 * Names the string literals written to `plan_runs.status` (a plain TEXT column, no DB
 * enum). `STALE` is the terminal status a hard-crashed run is swept to — distinct from
 * `FAILED` (an actual run error) so operators can tell "lost contact" from "the run
 * errored". Light-touch: existing scattered literals are left as-is; this exists to name
 * the new value and give the reader/sweeper a single reference.
 */
export const PLAN_RUN_STATUS = {
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  IN_PROGRESS: 'IN_PROGRESS',
  /**
   * Terminal: a scheduled run that could not fire within the grace window after its `scheduled_for`
   * (the server was down, or the delayed job was lost and re-projected too late). Written by the
   * fire-time policy and the boot reconcile; the run never started. Distinct from SUPERSEDED.
   */
  MISSED: 'MISSED',
  QUEUED: 'QUEUED',
  /**
   * A run scheduled for `scheduled_for` whose delayed BullMQ job is waiting. Not terminal: when the
   * job fires the processor claims it SCHEDULED -> QUEUED (with the plan/task QUEUED flip) and then
   * IN_PROGRESS, unless the fire-time policy settles it MISSED or SUPERSEDED; cancel settles it
   * CANCELLED. The run holds no worktree until it fires.
   */
  SCHEDULED: 'SCHEDULED',
  /**
   * Terminal: a scheduled run that fired but found nothing runnable (no task left to pick up), so
   * it was skipped rather than run. The run never started and `settled_reason` says why. Distinct
   * from COMPLETED, which means a run did work, and from SUPERSEDED, which means another run was active.
   */
  SKIPPED: 'SKIPPED',
  STALE: 'STALE',
  /**
   * Terminal: a scheduled run held at fire time because the plan already had an active
   * (QUEUED/IN_PROGRESS) run, so starting it would have double-run the plan. The run never started.
   * Distinct from MISSED.
   */
  SUPERSEDED: 'SUPERSEDED',
  /**
   * Terminal for the row it is written to: the run stopped cleanly because the agent account hit a
   * subscription usage limit. Distinct from FAILED (the run did not err) and STALE (contact was not
   * lost). A continuation run may follow, linked by `plan_runs.resume_of_run_id`; that run is a NEW
   * row, so this one is settled rather than held open. The stale sweeps only select IN_PROGRESS, so
   * it is exempt from them by construction.
   */
  USAGE_LIMITED: 'USAGE_LIMITED',
} as const;
/**
 * The statuses a worker may claim a run from (`markRunStarted`): QUEUED on first pickup, IN_PROGRESS
 * when BullMQ retries or recovers a stalled job. Every other status is either not yet startable
 * (SCHEDULED — the fire-time policy claims it to QUEUED first) or settled, and a settled row is never
 * reopened.
 * @public
 */
export const PLAN_RUN_STARTABLE_STATUSES = [
  PLAN_RUN_STATUS.IN_PROGRESS,
  PLAN_RUN_STATUS.QUEUED,
] as const;

/**
 * The cutoff for an UNSUPERVISED run — one with `heartbeat_expected = false`, whose owner
 * carries no timer (migration 110). Such a run cannot be judged by {@link STALE_CUTOFF_MS}:
 * silence is its normal state, so a 120s verdict would be a false positive on live work.
 *
 * Staleness here is not inferred from quiet but from sheer age. Twelve hours is far longer
 * than any interactive agent turn — a laptop that has been asleep, closed or rebooted has
 * long since taken its loop with it — so a row this old is dead by any reasonable measure.
 *
 * Crucially, a run swept on THIS cutoff is settled WITHOUT the plan reconcile step: plan and
 * task status are never rewritten on the strength of a missing heartbeat. That is the exact
 * hazard migration 110 exists to avoid, and it is what makes a false positive here harmless.
 */
export const UNSUPERVISED_STALE_CUTOFF_MS = 12 * 60 * 60 * 1_000;
