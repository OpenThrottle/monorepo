import { describe, expect, it } from 'vitest';

import { normalizeDate } from '../normalize-date';

describe('normalizeDate', () => {
  it('returns a Date unchanged', () => {
    const date = new Date('2026-06-15T10:00:00.000Z');
    expect(normalizeDate(date)).toBe(date);
  });

  it('parses an ISO string', () => {
    expect(normalizeDate('2026-06-15T10:00:00.000Z').toISOString()).toBe(
      '2026-06-15T10:00:00.000Z',
    );
  });

  it('falls back to now when omitted', () => {
    const before = Date.now();
    const result = normalizeDate(undefined).getTime();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(Date.now());
  });
});
