import { describe, expect, it } from 'vitest';
import { parseSkillScope } from '~/routing/usage/utils/parse-skill-scope';
import { SKILL_USAGE_SCOPES } from '~/routing/usage/data/skill-usage-copy';

describe('parseSkillScope', () => {
  it('returns the "ours" scope unchanged', () => {
    expect(parseSkillScope(SKILL_USAGE_SCOPES.OURS)).toBe(
      SKILL_USAGE_SCOPES.OURS,
    );
  });

  it('returns the "third-party" scope unchanged', () => {
    expect(parseSkillScope(SKILL_USAGE_SCOPES.THIRD_PARTY)).toBe(
      SKILL_USAGE_SCOPES.THIRD_PARTY,
    );
  });

  it('falls back to null for null input', () => {
    expect(parseSkillScope(null)).toBeNull();
  });

  it('falls back to null for an unrecognized value', () => {
    expect(parseSkillScope('everything')).toBeNull();
  });

  it('falls back to null for an empty string', () => {
    expect(parseSkillScope('')).toBeNull();
  });
});
