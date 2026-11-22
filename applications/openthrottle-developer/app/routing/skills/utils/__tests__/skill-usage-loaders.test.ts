import { describe, expect, it } from 'vitest';

import { getSkillUsageWindow } from '../skill-usage-loaders';

describe('getSkillUsageWindow', () => {
  it('spans the trailing 30 days as YYYY-MM-DD', () => {
    expect(getSkillUsageWindow(new Date('2026-08-31T12:00:00Z'))).toEqual({
      end: '2026-08-31',
      start: '2026-08-01',
    });
  });
});
