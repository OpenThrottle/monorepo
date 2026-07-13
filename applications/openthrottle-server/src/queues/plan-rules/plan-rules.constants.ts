/** Queue name for tag→action rule evaluation. */
export const PLAN_RULES_QUEUE_NAME = 'plan-rules';

/** Job name for one plan evaluation pass. */
export const PLAN_RULES_EVALUATE_JOB_NAME = 'evaluate';

/** Worker concurrency: evaluations are cheap DB reads + ledger writes. */
export const PLAN_RULES_WORKER_CONCURRENCY = 2;
