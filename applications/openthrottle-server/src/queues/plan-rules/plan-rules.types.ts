/**
 * @description Job payload + trigger taxonomy for plan-rules:evaluate.
 */
import type { SkillAvailabilityEnvironment } from '@openthrottle/openthrottle-skills';
import type { Job } from 'bullmq';

import type { PLAN_RULES_TRIGGER_KINDS } from './plan-rules.constants.ts';
export type PlanRulesTriggerKind =
  (typeof PLAN_RULES_TRIGGER_KINDS)[keyof typeof PLAN_RULES_TRIGGER_KINDS];

/**
 * @description The environment an evaluation pass runs in: the same
 * `ci | interactive | ralph` union as `tag_action_rules.environment`, or null
 * when the trigger does not know its environment (environment-qualified rules
 * then do not match).
 */
export type PlanRulesEnvironment = SkillAvailabilityEnvironment | null;

export interface PlanRulesEvaluateJobData {
  readonly environment: PlanRulesEnvironment;
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
