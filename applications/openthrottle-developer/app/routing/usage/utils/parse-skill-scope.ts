import {
  SKILL_USAGE_SCOPES,
  type SkillUsageScopeFilter,
} from '~/routing/usage/data/skill-usage-copy';

/**
 * Narrow a raw `skillScope` search-param value to a valid
 * {@link SkillUsageScopeFilter}, falling back to `null` (all scopes) for any
 * unrecognized value.
 */
export const parseSkillScope = (raw: string | null): SkillUsageScopeFilter => {
  if (
    raw === SKILL_USAGE_SCOPES.OURS ||
    raw === SKILL_USAGE_SCOPES.THIRD_PARTY
  ) {
    return raw;
  }
  return null;
};
