import { describe, expect, it } from 'vitest';

import { isSkillUsageScope } from './skill-usage-scope.utils.ts';

describe('isSkillUsageScope', () => {
  it.each(['injected', 'ours', 'personal', 'third-party'])(
    'accepts %s',
    (value) => {
      expect(isSkillUsageScope(value)).toBe(true);
    },
  );

  it('rejects a value outside the vocabulary', () => {
    expect(isSkillUsageScope('mine')).toBe(false);
  });
});
