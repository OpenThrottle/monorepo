import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  formatDateShort,
  formatDurationBetween,
  formatPlanDate,
  formatUpdatedAt,
  getRequirementsCount,
  parseRequirementsList,
} from '../formatters';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

afterEach(() => {
  vi.useRealTimers();
});

describe('getRequirementsCount', () => {
  test('returns 0 for null', () => {
    expect(getRequirementsCount(null)).toBe(0);
  });

  test('returns 0 for undefined', () => {
    expect(getRequirementsCount(undefined)).toBe(0);
  });

  test('returns 0 for empty string', () => {
    expect(getRequirementsCount('')).toBe(0);
  });

  test('returns 0 for invalid JSON', () => {
    expect(getRequirementsCount('{not json')).toBe(0);
  });

  test('returns 0 for valid JSON that is not an array', () => {
    expect(getRequirementsCount('{"a":1}')).toBe(0);
  });

  test('returns array length for a JSON array', () => {
    expect(getRequirementsCount('["a","b","c"]')).toBe(3);
  });
});

describe('parseRequirementsList', () => {
  test('returns [] for null', () => {
    expect(parseRequirementsList(null)).toEqual([]);
  });

  test('returns [] for undefined', () => {
    expect(parseRequirementsList(undefined)).toEqual([]);
  });

  test('returns [] for empty string', () => {
    expect(parseRequirementsList('')).toEqual([]);
  });

  test('returns [] for invalid JSON', () => {
    expect(parseRequirementsList('not json')).toEqual([]);
  });

  test('returns [] for JSON that is not an array', () => {
    expect(parseRequirementsList('{"a":1}')).toEqual([]);
  });

  test('filters out non-string items from the array', () => {
    expect(parseRequirementsList('["a",1,"b",null]')).toEqual(['a', 'b']);
  });
});

describe('formatUpdatedAt', () => {
  test('returns null for invalid date-like input', () => {
    expect(formatUpdatedAt('not-a-date')).toBeNull();
  });

  test('returns null for non-date-like input', () => {
    expect(formatUpdatedAt({})).toBeNull();
  });

  test('returns relative time string for a valid date', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
    const result = formatUpdatedAt(FIXED_NOW.toISOString());
    expect(result).not.toBeNull();
    expect(result).toMatch(/ago|from now/);
  });
});

describe('formatDateShort', () => {
  test('returns null for invalid date-like input', () => {
    expect(formatDateShort('nope')).toBeNull();
  });

  test('returns formatted short date/time for a valid date', () => {
    const result = formatDateShort('2025-01-02T12:00:00Z');
    expect(result).not.toBeNull();
    expect(result).toMatch(/\d/);
  });
});

describe('formatPlanDate', () => {
  test('returns em dash for null', () => {
    expect(formatPlanDate(null)).toBe('—');
  });

  test('returns em dash for undefined', () => {
    expect(formatPlanDate(undefined)).toBe('—');
  });

  test('formats a numeric timestamp', () => {
    const result = formatPlanDate(1735819200000);
    expect(result).not.toBe('—');
    expect(result).toMatch(/\d/);
  });

  test('formats a string date value', () => {
    const result = formatPlanDate('2025-01-02T12:00:00Z');
    expect(result).not.toBe('—');
    expect(result).toMatch(/\d/);
  });
});

describe('formatDurationBetween', () => {
  const start = '2026-01-15T12:00:00.000Z';

  test('formats sub-minute gaps in seconds', () => {
    expect(formatDurationBetween(start, '2026-01-15T12:00:45.000Z')).toBe(
      '45s',
    );
    expect(formatDurationBetween(start, start)).toBe('0s');
  });

  test('formats minutes and seconds', () => {
    expect(formatDurationBetween(start, '2026-01-15T12:04:12.000Z')).toBe(
      '4m 12s',
    );
  });

  test('drops a zero trailing unit', () => {
    expect(formatDurationBetween(start, '2026-01-15T12:04:00.000Z')).toBe('4m');
    expect(formatDurationBetween(start, '2026-01-15T14:00:30.000Z')).toBe('2h');
  });

  test('formats hours with minutes and days with hours', () => {
    expect(formatDurationBetween(start, '2026-01-15T14:05:09.000Z')).toBe(
      '2h 5m',
    );
    expect(formatDurationBetween(start, '2026-01-16T15:30:00.000Z')).toBe(
      '1d 3h',
    );
  });

  test('returns null for invalid input or a negative gap', () => {
    expect(formatDurationBetween('nope', start)).toBeNull();
    expect(formatDurationBetween(start, null)).toBeNull();
    expect(formatDurationBetween(start, '2026-01-15T11:59:00.000Z')).toBeNull();
  });
});
