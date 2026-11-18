import { describe, expect, it } from 'vitest';

import { isSkillUsageOutcome } from './skill-usage-outcome-value.utils.ts';

describe('isSkillUsageOutcome', () => {
  it.each(['abandoned', 'error', 'session_ended', 'success'])(
    'accepts %s',
    (value) => {
      expect(isSkillUsageOutcome(value)).toBe(true);
    },
  );

  it('rejects a value outside the vocabulary', () => {
    expect(isSkillUsageOutcome('done')).toBe(false);
  });
});
