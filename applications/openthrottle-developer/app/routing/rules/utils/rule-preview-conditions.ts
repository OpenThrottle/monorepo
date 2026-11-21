import type { RulePreviewNonMatch } from '~/routing/rules/types';

type RulePreviewCondition = RulePreviewNonMatch['conditions'][number];

/**
 * @description The conditions worth a badge: every one the rule qualifies on, plus any that failed.
 * An unqualified condition that passed (the rule says "any") is noise, so it is dropped.
 */
export const selectVisibleConditions = (
  conditions: readonly RulePreviewCondition[],
): RulePreviewCondition[] => {
  return conditions.filter((result) => {
    return result.expected != null || !result.passed;
  });
};
