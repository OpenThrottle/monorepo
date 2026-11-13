/**
 * @description Pure tag→action rule evaluation — zero I/O, following the
 * resolveSkillAvailability precedent. Callers (the plan-rules:evaluate worker,
 * plan-context availability reads) load the plan's effective tag set and the
 * owner's rules, then ask this function which actions match. Matching is
 * AND-composed: enabled && project (rule NULL or equal) && environment (rule
 * NULL or equal) && tag_all ⊆ effectiveTags && status (rule NULL or equal).
 * Unknown tags in tag_all simply never match (graceful degrade). Output is
 * ALL matched actions — there is no global priority; per-action arbitration
 * (e.g. deny-wins for availability exceptions) happens downstream.
 * See docs/monorepo/plan-task-tags-rules-design.md ("Rules engine").
 */

import type { TagActionType } from './tag-action-payloads.ts';

/**
 * @description The evaluator's view of one stored tag_action_rules row.
 * @public
 */
export interface TagActionRuleInput {
  readonly actionPayload: unknown;
  readonly actionType: TagActionType;
  readonly enabled: boolean;
  /** NULL applies to every environment. */
  readonly environment: string | null;
  readonly id: string;
  /** NULL matches every project. */
  readonly projectId: string | null;
  /** NULL matches every plan status. */
  readonly status: string | null;
  /** Tags that must ALL be present; empty matches every plan. */
  readonly tagAll: readonly string[];
}

/**
 * @description The plan-side facts a rule is matched against.
 * @public
 */
export interface TagActionEvaluationContext {
  /** Effective tag names (plan ∪ tasks, deduped). */
  readonly effectiveTags: readonly string[];
  /** Evaluation environment; null when not running in a qualified context. */
  readonly environment: string | null;
  readonly planStatus: string;
  readonly projectId: string | null;
}

/**
 * @description One matched rule action, ready for executor dispatch.
 * @public
 */
export interface MatchedTagAction {
  readonly actionPayload: unknown;
  readonly actionType: TagActionType;
  /** The context tags that satisfied tag_all (equal to tagAll on match). */
  readonly matchedTags: readonly string[];
  readonly ruleId: string;
}

/**
 * @description Evaluates every rule against the context and returns ALL
 * matched actions in input order. Pure and synchronous — no I/O.
 * @public
 */
export const evaluateTagActionRules = (
  context: TagActionEvaluationContext,
  rules: readonly TagActionRuleInput[],
): MatchedTagAction[] => {
  const effective = new Set(context.effectiveTags);

  const matched: MatchedTagAction[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.projectId != null && rule.projectId !== context.projectId) {
      continue;
    }
    if (rule.environment != null && rule.environment !== context.environment) {
      continue;
    }
    if (rule.status != null && rule.status !== context.planStatus) continue;
    if (!rule.tagAll.every((tag) => effective.has(tag))) continue;

    matched.push({
      actionPayload: rule.actionPayload,
      actionType: rule.actionType,
      matchedTags: [...rule.tagAll],
      ruleId: rule.id,
    });
  }

  return matched;
};
