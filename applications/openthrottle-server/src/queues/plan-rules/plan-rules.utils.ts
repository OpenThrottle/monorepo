/**
 * @description Plan-scoped BullMQ deduplication id for an evaluation pass. Used
 * with `deduplication: { keepLastIfActive: true }` so a burst of triggers for
 * one plan collapses into at most one active + one waiting pass (never two
 * concurrent passes for the same plan), while distinct plans stay independent.
 * Serializing per plan is what makes the placement-reconcile writes (which
 * touch `UNIQUE(plan_id, sort_order)`) collision-safe across passes.
 */
export const planRulesEvaluationDedupId = (planId: string): string => {
  return `plan:${planId}`;
};
