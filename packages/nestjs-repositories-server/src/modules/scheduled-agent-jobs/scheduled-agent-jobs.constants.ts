/**
 * @description What happens to a cron fire that starts more than `misfireThresholdMs` after its slot
 * (migration 141): `skip` records it as a `missed` run; `catch_up_once` runs the most recent late fire
 * once and records any earlier ones as `missed`. A fire within the threshold always runs.
 * @public
 */
export const SCHEDULED_AGENT_JOB_MISFIRE_POLICIES = [
  'catch_up_once',
  'skip',
] as const;

/**
 * @description How a schedule fires (migration 142): `cron` (a pattern in a timezone; the default),
 * `interval` (elapsed time after the previous fire finishes), or `once` (a single fire at `runAt`).
 * @public
 */
export const SCHEDULED_AGENT_JOB_SCHEDULE_KINDS = [
  'cron',
  'interval',
  'once',
] as const;
