import type { MatchedTagAction, TagActionRuleScope } from './tag-actions.ts';

/**
 * @description Specificity weights for {@link scoreTagActionSpecificity}. Project and repository
 * scopes are worth two each: they are the narrowest rungs of the ladder. They do not nest (a
 * project can span many repositories, a repository can serve many projects), so neither ranks
 * above the other; a rule scoped to both simply adds both weights. Environment and status
 * qualifiers are worth one each; every tag in `tagAll` adds one.
 * @public
 */
export const TAG_ACTION_SPECIFICITY_WEIGHTS = {
  ENVIRONMENT: 1,
  PROJECT: 2,
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
  const project =
    scope.projectId == null ? 0 : TAG_ACTION_SPECIFICITY_WEIGHTS.PROJECT;
  const repository =
    scope.repositoryId == null ? 0 : TAG_ACTION_SPECIFICITY_WEIGHTS.REPOSITORY;
  const environment =
    scope.environment == null ? 0 : TAG_ACTION_SPECIFICITY_WEIGHTS.ENVIRONMENT;
  const status =
    scope.status == null ? 0 : TAG_ACTION_SPECIFICITY_WEIGHTS.STATUS;
  const tags = scope.tagAll.length * TAG_ACTION_SPECIFICITY_WEIGHTS.TAG;

  return project + repository + environment + status + tags;
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
