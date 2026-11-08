/**
 * @description GraphQL `extensions.code` values a scheduling or run-now request is rejected with
 * (OT plan 764c7654, D8). Clients map each code to a confirm dialog, so a stale page or a second tab
 * lands on the same confirm the fresh page would have shown.
 *
 * - `PLAN_ALREADY_SCHEDULED` — the plan already has its one SCHEDULED run (D3). Retry with
 *   `replaceScheduled` (schedule) or `cancelScheduled` (run now).
 * - `PLAN_ACTIVE` — the plan is QUEUED (a usage-limit resume wait included) or IN_PROGRESS (D2).
 * - `PLAN_NOT_SCHEDULABLE` — the plan is BLOCKED or terminal (D2).
 */
export const PLAN_SCHEDULE_CONFLICT_CODE = {
  PLAN_ACTIVE: 'PLAN_ACTIVE',
  PLAN_ALREADY_SCHEDULED: 'PLAN_ALREADY_SCHEDULED',
  PLAN_NOT_SCHEDULABLE: 'PLAN_NOT_SCHEDULABLE',
} as const;

/** @description Plan statuses a run may be scheduled from (D2). */
export const SCHEDULABLE_PLAN_STATUSES: readonly string[] = [
  'BACKLOG',
  'PENDING',
];

/** @description Plan statuses that mean a run is queued or executing (D2 → PLAN_ACTIVE). */
export const ACTIVE_PLAN_STATUSES: readonly string[] = [
  'IN_PROGRESS',
  'QUEUED',
];

/** @description The partial unique index of migration 152: at most one SCHEDULED run per plan. */
export const ONE_SCHEDULED_RUN_INDEX = 'plan_runs_one_scheduled_per_plan_idx';
