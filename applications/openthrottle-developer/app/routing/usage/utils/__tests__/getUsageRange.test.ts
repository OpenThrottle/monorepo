import { describe, expect, test } from 'vitest';

import { getUsageRange } from '../getUsageRange';

describe('getUsageRange', () => {
  test('spans 30 days ending at the given instant', () => {
    const range = getUsageRange(new Date('2026-02-15T12:30:00.000Z'));

    expect(range).toEqual({
      endDate: '2026-02-15',
      endIso: '2026-02-15T12:30:00.000Z',
      rangeDays: 30,
      startDate: '2026-01-16',
      startIso: '2026-01-16T12:30:00.000Z',
    });
  });

  test('defaults to the current time', () => {
    const range = getUsageRange();

    expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.startDate < range.endDate).toBe(true);
  });
});
