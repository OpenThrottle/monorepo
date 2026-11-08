/**
 * @description Job payload + trigger taxonomy for plan-rules:evaluate.
 */
import type { Job } from 'bullmq';

import type { PLAN_RULES_TRIGGER_KINDS } from './plan-rules.constants.ts';
export type PlanRulesTriggerKind =
  (typeof PLAN_RULES_TRIGGER_KINDS)[keyof typeof PLAN_RULES_TRIGGER_KINDS];

export interface PlanRulesEvaluateJobData {
  readonly planId: string;
  readonly triggerKind: PlanRulesTriggerKind;
}

export interface PlanRulesEvaluateJobResult {
  readonly dispatched: number;
  readonly matched: number;
  readonly orphaned: number;
  /** Already-'applied' matched rows whose executor reconcile pass ran. */
  readonly reconciled: number;
  /** Matched rows re-injected (deleted-task reset or orphan revive). */
  readonly reinjected: number;
  readonly skipped: string | null;
}

export type PlanRulesEvaluateJob = Job<
  PlanRulesEvaluateJobData,
  PlanRulesEvaluateJobResult
>;
