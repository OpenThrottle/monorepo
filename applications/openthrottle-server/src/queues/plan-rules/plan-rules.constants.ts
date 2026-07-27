/** Queue name for tag→action rule evaluation. */
export const PLAN_RULES_QUEUE_NAME = 'plan-rules';

/** Job name for one plan evaluation pass. */
export const PLAN_RULES_EVALUATE_JOB_NAME = 'evaluate';

/** Worker concurrency: evaluations are cheap DB reads + ledger writes. */
export const PLAN_RULES_WORKER_CONCURRENCY = 2;

/**
 * @description Plan-scoped BullMQ deduplication id for an evaluation pass. Used
 * with `deduplication: { keepLastIfActive: true }` so a burst of triggers for
 * one plan collapses into at most one active + one waiting pass (never two
 * concurrent passes for the same plan), while distinct plans stay independent.
 * Serializing per plan is what makes the placement-reconcile writes (which
 * touch `UNIQUE(plan_id, sort_order)`) collision-safe across passes.
 */
export const planRulesEvaluationDedupId = (planId: string): string =>
  `plan:${planId}`;
