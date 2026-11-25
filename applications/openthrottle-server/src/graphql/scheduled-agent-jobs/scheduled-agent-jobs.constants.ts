/** Machine-readable `extensions.code` values of the scheduling guardrail errors. */
export const SCHEDULED_AGENT_JOB_LIMIT_CODES = {
  APPROVAL_PENDING: 'SCHEDULED_AGENT_JOB_APPROVAL_PENDING',
  LIMIT_REACHED: 'SCHEDULED_AGENT_JOB_LIMIT_REACHED',
} as const;

export type ScheduledAgentJobLimitCodesKey =
  keyof typeof SCHEDULED_AGENT_JOB_LIMIT_CODES;
export type ScheduledAgentJobLimitCodesValue =
  (typeof SCHEDULED_AGENT_JOB_LIMIT_CODES)[ScheduledAgentJobLimitCodesKey];

/** Most command patterns one job may pre-approve (`allowed_commands`, migration 205). */
export const SCHEDULED_AGENT_JOB_MAX_ALLOWED_COMMANDS = 20;

/** Longest single command pattern, in characters. */
export const SCHEDULED_AGENT_JOB_MAX_ALLOWED_COMMAND_LENGTH = 200;
