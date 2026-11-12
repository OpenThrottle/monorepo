import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeDate } from '../normalizeDate';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

describe('normalizeDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
    expect(normalizeDate(undefined).getTime()).toBe(FIXED_NOW.getTime());
  });
});
