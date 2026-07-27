/**
 * @description Job payload + trigger taxonomy for plan-rules:evaluate.
 */

import type { Job } from 'bullmq';

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
  readonly skipped: string | null;
}

export type PlanRulesEvaluateJob = Job<
  PlanRulesEvaluateJobData,
  PlanRulesEvaluateJobResult
>;
