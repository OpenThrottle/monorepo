import { describe, expect, test } from 'vitest';
import { formatWhen } from '../format-when';

describe('formatWhen', () => {
  test('returns an em dash for undefined', () => {
    expect(formatWhen(undefined)).toBe('—');
  });

  test('returns an em dash for null', () => {
    expect(formatWhen(null)).toBe('—');
  });

  test('returns an em dash for an empty string', () => {
    expect(formatWhen('')).toBe('—');
  });

  test('formats an ISO timestamp using the locale string representation', () => {
    const iso = '2026-03-14T12:00:00.000Z';
    expect(formatWhen(iso)).toBe(new Date(iso).toLocaleString());
  });
});
