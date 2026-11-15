/**
 * @public
 * @description The values of `plan_run_schedules.schedule_kind` (CHECK-constrained in migration 163).
 */
export const PLAN_RUN_SCHEDULE_KINDS = {
  CRON: 'cron',
} as const;

/**
 * @public
 * @description The values of `plan_run_schedules.misfire_policy` (CHECK-constrained in migration 163):
 * `skip` drops a missed occurrence, `run_once` fires a single catch-up run.
 */
export const PLAN_RUN_SCHEDULE_MISFIRE_POLICIES = {
  RUN_ONCE: 'run_once',
  SKIP: 'skip',
} as const;
