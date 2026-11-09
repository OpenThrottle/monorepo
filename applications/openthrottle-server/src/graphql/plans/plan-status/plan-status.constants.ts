/**
 * @description Machine-readable primary outcome of a cancel-plan-run request (the honest replacement
 * for inferring success from `activeJobIdsCouldNotCancel`). Drives the UI toast/label. `as const`
 * object rather than a TS enum per repo style.
 */
export const CANCEL_PLAN_RUN_OUTCOME = {
  /** A durable cancel was requested for a run not confirmed to be actively executing (e.g. detached CLI, or a run between iterations); it stops at its next checkpoint. */
  CANCELLATION_REQUESTED: 'CANCELLATION_REQUESTED',
  /** No queued job and no live run existed — nothing to cancel. */
  NO_ACTIVE_RUN: 'NO_ACTIVE_RUN',
  /** A queued (not-yet-started) job was removed from the queue; the plan was reset to PENDING. */
  RUN_CANCELLED: 'RUN_CANCELLED',
  /** An actively-executing run was signaled to stop (local abort or cross-process pub/sub); it stops imminently. */
  RUN_STOPPING: 'RUN_STOPPING',
} as const;
