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

/**
 * @description Which surface created a scheduled job (migration 183): `ui` for the Developer UI's
 * GraphQL mutations, `mcp` for the agent mutations behind the openthrottle-mcp scheduling tools. The
 * agent path may update or delete only `mcp` jobs.
 * @public
 */
export const SCHEDULED_AGENT_JOB_CREATED_VIA = ['mcp', 'ui'] as const;

/**
 * @description Approval state of a scheduled job (migration 183): `not_required` (the default),
 * `pending` (an agent-created job awaiting a human; stored disabled) or `approved`.
 * @public
 */
export const SCHEDULED_AGENT_JOB_APPROVAL_STATES = [
  'approved',
  'not_required',
  'pending',
] as const;
