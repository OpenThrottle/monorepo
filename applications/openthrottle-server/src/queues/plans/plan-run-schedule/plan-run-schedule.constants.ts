/**
 * @description The shortest allowed gap between two consecutive slots of a recurring plan-run
 * schedule. An agent run is too heavy to fire more often than hourly, and it is also what lets the
 * one-hour grace window ({@link SCHEDULED_PLAN_RUN_GRACE_MS}) decide MISSED per occurrence without
 * two occurrences ever overlapping their windows.
 */
export const PLAN_RUN_SCHEDULE_MIN_INTERVAL_MS = 60 * 60 * 1_000;

/**
 * @description How many upcoming slots {@link validatePlanRunScheduleCron} inspects when it checks
 * the minimum interval. A cron pattern's gaps repeat within a short horizon (a day, week or month for
 * every realistic pattern), so a sample is enough; it is a bounded check, not a proof for patterns
 * whose gaps only shrink decades out.
 */
export const PLAN_RUN_SCHEDULE_INTERVAL_SAMPLE_SLOTS = 50;

/**
 * @description How far in the future a `run_once` catch-up is scheduled: far enough that the add of
 * its delayed job is committed before it is due, near enough to read as "immediately". The run then
 * goes through the ordinary fire path (collision hold, nothing-to-run, workspace check).
 */
export const PLAN_RUN_SCHEDULE_CATCH_UP_DELAY_MS = 5_000;

/**
 * @description The oldest unserved slot a `run_once` schedule still catches up on. A slot older than
 * this is treated as skipped: a catch-up for a week-old slot is no longer the run the user meant.
 */
export const PLAN_RUN_SCHEDULE_CATCH_UP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
