import { SKILL_USAGE_SCOPES } from '../skill-usage-events.constants.ts';
import type { SkillUsageScope } from '../skill-usage-events.types.ts';

const SKILL_USAGE_SCOPE_VALUES: readonly string[] =
  Object.values(SKILL_USAGE_SCOPES);

/**
 * @description Type predicate over {@link SKILL_USAGE_SCOPES}, derived from the const so a
 * new member widens every caller for free. The canonical one — the resolver
 * and the repository both use this rather than hand-rolling a chain of
 * `===` comparisons that silently stops matching when the vocabulary grows.
 *
 * @public
 */
export const isSkillUsageScope = (value: string): value is SkillUsageScope => {
  return SKILL_USAGE_SCOPE_VALUES.includes(value);
};
