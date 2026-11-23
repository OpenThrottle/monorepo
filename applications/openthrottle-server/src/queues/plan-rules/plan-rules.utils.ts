import type {
  InjectTaskActionPayload,
  MatchedTagAction,
} from '@openthrottle/openthrottle-skills';
import {
  injectTaskActionPayloadSchema,
  rankMatchedTagActions,
  SKILL_AVAILABILITY_ENVIRONMENTS,
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
 * a null-environment pass replacing a pending `headless` one would silently drop
 * the headless-only matches. Distinct plans and distinct environments stay
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
 * @description Parses a caller-supplied environment claim (the raw `x-ot-environment` request
 * header) into a {@link PlanRulesEnvironment}. Anything outside `ci | headless | interactive` —
 * absent, blank, misspelled — is null, which is the safe answer: a null pass skips every
 * environment-qualified rule rather than matching the wrong environment's.
 */
export const parsePlanRulesEnvironment = (
  raw: string | undefined,
): PlanRulesEnvironment => {
  const value = raw?.trim().toLowerCase() ?? '';

  return (
    SKILL_AVAILABILITY_ENVIRONMENTS.find((known) => known === value) ?? null
  );
};

/**
 * @description Rule ids whose ledger rows an evaluation pass must leave alone because the pass
 * never evaluated them: rules qualified on an environment other than the pass's own. Without this
 * a null pass (a trigger that does not know its environment) would see a `headless`-only rule as
 * un-matched and orphan the task a `headless` pass injected, and the next `headless` pass would
 * re-inject it — a soft-close / re-inject thrash between overlapping passes. Pure.
 */
export const outOfEnvironmentRuleIds = (
  rules: readonly {
    readonly environment: string | null;
    readonly id: string;
  }[],
  environment: PlanRulesEnvironment,
): string[] => {
  return rules
    .filter(
      (rule) => rule.environment != null && rule.environment !== environment,
    )
    .map((rule) => rule.id);
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
