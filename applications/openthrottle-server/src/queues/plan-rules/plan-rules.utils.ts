import {
  type InjectTaskActionPayload,
  injectTaskActionPayloadSchema,
  type MatchedTagAction,
  rankMatchedTagActions,
  TAG_ACTION_TYPES,
} from '@openthrottle/openthrottle-skills';

import { PLAN_RULES_NULL_ENVIRONMENT_TOKEN } from './plan-rules.constants.ts';
import type { PlanRulesEnvironment } from './plan-rules.types.ts';

/**
 * @description Plan- and environment-scoped BullMQ deduplication id for an
 * evaluation pass. Used with `deduplication: { keepLastIfActive: true }` so a
 * burst of triggers for one plan in one environment collapses into at most one
 * active + one waiting pass (last write wins within an environment). The
 * environment is part of the key because rules are apply-once per (rule, plan):
 * a null-environment pass replacing a pending `ralph` one would silently drop
 * the ralph-only matches. Distinct plans and distinct environments stay
 * independent. (Deduplication ids are not BullMQ custom job ids, so the `:`
 * separator is fine.)
 */
export const planRulesEvaluationDedupId = (
  planId: string,
  environment: PlanRulesEnvironment,
): string => {
  return `plan:${planId}:env:${environment ?? PLAN_RULES_NULL_ENVIRONMENT_TOKEN}`;
};

/**
 * @description Identity of an inject-task injection for supersede arbitration: same skill, same
 * placement and, for `before`/`after`, the same anchor (compared by its parsed fields).
 */
const injectTaskDedupeKey = (payload: InjectTaskActionPayload): string => {
  return JSON.stringify([
    payload.skillSlug,
    payload.placement,
    payload.anchor?.skillSlug ?? null,
    payload.anchor?.taskId ?? null,
    payload.anchor?.titleMatch ?? null,
  ]);
};

/**
 * @description Finds inject-task matches that would inject the same skill at the same placement as
 * a narrower match. Returns `loserRuleId -> winnerRuleId`. The narrowest wins per
 * {@link rankMatchedTagActions} (ties: oldest rule, then rule id). Runs over ALL matches, applied
 * or not, so an already-applied narrow winner still supersedes a fresh broader duplicate. Only
 * `inject-task` is arbitrated: other action types are additive. A payload that fails to parse is
 * left out (neither winner nor loser). Pure.
 */
export const findSupersededInjectTasks = (
  matches: readonly MatchedTagAction[],
): Map<string, string> => {
  const winners = new Map<string, string>();
  const superseded = new Map<string, string>();

  for (const action of rankMatchedTagActions(matches)) {
    if (action.actionType !== TAG_ACTION_TYPES.INJECT_TASK) {
      continue;
    }
    const parsed = injectTaskActionPayloadSchema.safeParse(
      action.actionPayload,
    );
    if (!parsed.success) {
      continue;
    }

    const key = injectTaskDedupeKey(parsed.data);
    const winnerRuleId = winners.get(key);
    if (winnerRuleId == null) {
      winners.set(key, action.ruleId);
    } else {
      superseded.set(action.ruleId, winnerRuleId);
    }
  }

  return superseded;
};
