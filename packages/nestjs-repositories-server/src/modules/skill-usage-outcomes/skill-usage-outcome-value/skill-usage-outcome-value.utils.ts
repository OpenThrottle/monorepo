import { SKILL_USAGE_OUTCOMES } from '../skill-usage-outcomes.constants.ts';
import type { SkillUsageOutcomeValue } from '../skill-usage-outcomes.types.ts';

const SKILL_USAGE_OUTCOME_VALUES: readonly string[] =
  Object.values(SKILL_USAGE_OUTCOMES);

/**
 * @description Type predicate over {@link SKILL_USAGE_OUTCOMES}, derived from the const so a
 * new member is accepted everywhere for free. A hand-listed `===` chain in the
 * resolver once omitted `SESSION_ENDED`, and every automatic session-end
 * outcome was rejected for six weeks before anyone noticed.
 *
 * @public
 */
export const isSkillUsageOutcome = (
  value: string,
): value is SkillUsageOutcomeValue => {
  return SKILL_USAGE_OUTCOME_VALUES.includes(value);
};
