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
  QUEUED: 'QUEUED',
  STALE: 'STALE',
} as const;

export type PlanRunStatus =
  (typeof PLAN_RUN_STATUS)[keyof typeof PLAN_RUN_STATUS];

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
