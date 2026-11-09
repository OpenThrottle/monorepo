/** Queue name for tag→action rule evaluation. */
export const PLAN_RULES_QUEUE_NAME = 'plan-rules';

/** Job name for one plan evaluation pass. */
export const PLAN_RULES_EVALUATE_JOB_NAME = 'evaluate';

/** Worker concurrency: evaluations are cheap DB reads + ledger writes. */
export const PLAN_RULES_WORKER_CONCURRENCY = 2;
/**
 * @description What caused an evaluation pass. Informational (logged and kept
 * on the job) — the evaluation itself is always a full pass over the plan.
 */
export const PLAN_RULES_TRIGGER_KINDS = {
  MANUAL: 'manual',
  PLAN_CREATED: 'plan-created',
  STATUS_CHANGED: 'status-changed',
  TAG_CHANGED: 'tag-changed',
  TASK_CREATED: 'task-created',
} as const;
