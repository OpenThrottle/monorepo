/**
 * @description Ranges and defaults of a webhook trigger's admission settings. The single definition
 * shared by the table's CHECK constraints (migration 182), the GraphQL inputs and the ingress, so
 * the bounds cannot drift. See docs/openthrottle/webhook-triggered-agent-jobs.md.
 * @public
 */
export const SCHEDULED_AGENT_JOB_WEBHOOK_LIMITS = {
  coalesceWindowMs: { max: 3_600_000, min: 0 },
  filterInValuesMax: 32,
  filtersMax: 16,
  maxInFlight: { max: 10, min: 1 },
  ratePerMinute: { max: 120, min: 1 },
  timestampToleranceSeconds: { max: 900, min: 30 },
} as const;

/**
 * @description Defaults a webhook trigger is created with.
 * @public
 */
export const SCHEDULED_AGENT_JOB_WEBHOOK_DEFAULTS = {
  coalesceWindowMs: 0,
  maxInFlight: 3,
  ratePerMinute: 30,
  timestampToleranceSeconds: 300,
} as const;

export type ScheduledAgentJobWebhookDefaultsKey =
  keyof typeof SCHEDULED_AGENT_JOB_WEBHOOK_DEFAULTS;
export type ScheduledAgentJobWebhookDefaultsValue =
  (typeof SCHEDULED_AGENT_JOB_WEBHOOK_DEFAULTS)[ScheduledAgentJobWebhookDefaultsKey];

/**
 * @description The signature presets a webhook trigger supports.
 * @public
 */
export const SCHEDULED_AGENT_JOB_WEBHOOK_PRESETS = [
  'custom',
  'generic',
  'github',
] as const;

/**
 * @description The filter operators; deliberately no regex (a user-authored regex over
 * attacker-controlled input is a ReDoS vector).
 * @public
 */
export const SCHEDULED_AGENT_JOB_WEBHOOK_FILTER_OPS = [
  'equals',
  'exists',
  'in',
  'not_equals',
  'not_exists',
  'prefix',
] as const;
