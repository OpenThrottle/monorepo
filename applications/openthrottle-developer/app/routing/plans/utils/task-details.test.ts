import { describe, expect, test } from 'vitest';
import { formatTaskDate } from './task-details';

describe('formatTaskDate', () => {
  test('returns em dash for null', () => {
    expect(formatTaskDate(null)).toBe('—');
  });

  test('returns em dash for undefined', () => {
    expect(formatTaskDate(undefined)).toBe('—');
  });

  test('returns em dash for invalid date string', () => {
    expect(formatTaskDate('not-a-date')).toBe('—');
  });

  test('returns em dash for NaN as number', () => {
    expect(formatTaskDate(Number.NaN)).toBe('—');
  });

  test('formats a valid ISO date string', () => {
    const result = formatTaskDate('2025-01-02T12:00:00Z');
    expect(result).not.toBe('—');
    expect(result).toMatch(/\d/);
  });

  test('formats a valid numeric timestamp', () => {
    const result = formatTaskDate(1735819200000);
    expect(result).not.toBe('—');
    expect(result).toMatch(/\d/);
  });
});
