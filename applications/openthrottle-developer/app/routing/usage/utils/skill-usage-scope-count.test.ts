import { describe, expect, test } from 'vitest';
import { skillUsageScopeCount } from './skill-usage-scope-count';
import type { UsageSkillUsageByScopeFragment } from '~/__generated__/graphql';

describe('skillUsageScopeCount', () => {
  test('returns the count for a matching scope', () => {
    const byScope: UsageSkillUsageByScopeFragment[] = [
      { __typename: 'SkillUsageByScopeObject', count: 3, scope: 'user' },
      { __typename: 'SkillUsageByScopeObject', count: 7, scope: 'project' },
    ];

    expect(skillUsageScopeCount(byScope, 'project')).toBe(7);
  });

  test('returns 0 when the scope has no rows', () => {
    const byScope: UsageSkillUsageByScopeFragment[] = [
      { __typename: 'SkillUsageByScopeObject', count: 3, scope: 'user' },
    ];

    expect(skillUsageScopeCount(byScope, 'plugin')).toBe(0);
  });

  test('returns 0 for an empty list', () => {
    expect(skillUsageScopeCount([], 'user')).toBe(0);
  });
});
