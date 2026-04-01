import { describe, expect, test } from 'vitest';
import { formatProjectDate } from '../format';

describe('formatProjectDate', () => {
  test('returns em dash for null', () => {
    expect(formatProjectDate(null)).toBe('—');
  });

  test('returns em dash for undefined', () => {
    expect(formatProjectDate(undefined)).toBe('—');
  });

  test('returns formatted string for valid ISO date string', () => {
    const result = formatProjectDate('2025-01-02T12:00:00Z');
    expect(result).not.toBe('—');
    expect(result).toMatch(/\d/);
  });

  test('returns formatted string for valid timestamp number', () => {
    const result = formatProjectDate(1735819200000);
    expect(result).not.toBe('—');
    expect(result).toMatch(/\d/);
  });

  test('returns em dash for invalid date string', () => {
    expect(formatProjectDate('not-a-date')).toBe('—');
  });

  test('returns em dash for NaN as number', () => {
    expect(formatProjectDate(Number.NaN)).toBe('—');
  });
});
