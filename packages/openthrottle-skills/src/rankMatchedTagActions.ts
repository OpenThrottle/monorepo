import type { MatchedTagAction, TagActionRuleScope } from './tag-actions.ts';

/**
 * @description Specificity weights for {@link scoreTagActionSpecificity}. A repository scope is
 * worth two because it is the narrowest rung of the ladder; environment and status qualifiers are
 * worth one each; every tag in `tagAll` adds one. `projectId` is deliberately not scored: it is
 * reserved for cross-repo Projects, which do not nest with repositories, so how the two rank is a
 * decision for that model.
 * @public
 */
export const TAG_ACTION_SPECIFICITY_WEIGHTS = {
  ENVIRONMENT: 1,
  REPOSITORY: 2,
  STATUS: 1,
  TAG: 1,
} as const;

/**
 * @description How narrowly a rule is scoped — higher is narrower. Pure. Shared by the plan-rules
 * dispatch (via {@link rankMatchedTagActions}) and by any surface that wants to order rules the way
 * the engine does, so the two can never disagree.
 * @public
 */
export const scoreTagActionSpecificity = (
  scope: TagActionRuleScope,
): number => {
  const repository =
    scope.repositoryId == null ? 0 : TAG_ACTION_SPECIFICITY_WEIGHTS.REPOSITORY;
  const environment =
    scope.environment == null ? 0 : TAG_ACTION_SPECIFICITY_WEIGHTS.ENVIRONMENT;
  const status =
    scope.status == null ? 0 : TAG_ACTION_SPECIFICITY_WEIGHTS.STATUS;
  const tags = scope.tagAll.length * TAG_ACTION_SPECIFICITY_WEIGHTS.TAG;

  return repository + environment + status + tags;
};

/**
 * @description Orders matched rule actions narrowest first, without dropping any: ranking only
 * decides precedence, arbitration (which match wins for a given action type) belongs to the
 * consumer. Ties break on the rule's `createdAt` ascending, then its id, so the order is stable
 * across evaluations. Pure — returns a new array and never mutates the input. Mirrors the
 * resolveSkillAvailability precedent (zero I/O).
 * @public
 */
export const rankMatchedTagActions = (
  matches: readonly MatchedTagAction[],
): MatchedTagAction[] => {
  return [...matches].sort((left, right) => {
    const bySpecificity =
      scoreTagActionSpecificity(right.scope) -
      scoreTagActionSpecificity(left.scope);
    if (bySpecificity !== 0) return bySpecificity;

    const byAge = left.createdAt.getTime() - right.createdAt.getTime();
    if (byAge !== 0) return byAge;

    return left.ruleId.localeCompare(right.ruleId);
  });
};
