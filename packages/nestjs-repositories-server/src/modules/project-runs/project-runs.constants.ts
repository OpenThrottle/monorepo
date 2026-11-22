/**
 * @description Constants for project runs: the `project_runs.status` values and the active set.
 * @public
 */

/**
 * Names the string literals written to `project_runs.status` (TEXT with a CHECK constraint,
 * migration 194). QUEUED and IN_PROGRESS are active; the rest are terminal.
 * @public
 */
export const PROJECT_RUN_STATUS = {
  /** Terminal: a cancel was requested; the current plan run was cancelled. */
  CANCELLED: 'CANCELLED',
  /** Terminal: every plan in the project is done. */
  COMPLETED: 'COMPLETED',
  /** A plan is running. */
  IN_PROGRESS: 'IN_PROGRESS',
  /** Created; nothing enqueued yet. */
  QUEUED: 'QUEUED',
  /** Terminal: a plan did not finish; `stopped_by_plan_id` and `stopped_reason` say which and why. */
  STOPPED: 'STOPPED',
} as const;

/**
 * The statuses a project run is still live in. The partial unique index
 * `uq_project_runs_one_active_per_project` allows one row per project in these.
 * @public
 */
export const PROJECT_RUN_ACTIVE_STATUSES = [
  PROJECT_RUN_STATUS.IN_PROGRESS,
  PROJECT_RUN_STATUS.QUEUED,
] as const;
