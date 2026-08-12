import { describe, expect, test, vi } from 'vitest';
import { fnv1a32Hex, formatIso, formatRelativeFromIso } from '../utils.prompts';

describe('formatIso', () => {
  test('formats a valid ISO string using the locale date/time style', () => {
    const iso = '2026-03-15T10:30:00.000Z';
    const result = formatIso(iso);
    expect(result).toBe(
      new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    );
  });

  test('returns the original string unchanged when it is not a valid date', () => {
    expect(formatIso('not-a-date')).toBe('not-a-date');
  });
});

describe('formatRelativeFromIso', () => {
  test('returns an empty string for an invalid ISO string', () => {
    expect(formatRelativeFromIso('not-a-date')).toBe('');
  });

  test('formats a difference under an hour in minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    try {
      const iso = '2026-01-01T00:10:00.000Z';
      expect(formatRelativeFromIso(iso)).toBe('in 10 minutes');
    } finally {
      vi.useRealTimers();
    }
  });

  test('formats a difference under 48 hours in hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    try {
      const iso = '2026-01-01T05:00:00.000Z';
      expect(formatRelativeFromIso(iso)).toBe('in 5 hours');
    } finally {
      vi.useRealTimers();
    }
  });

  test('formats a difference under a year in days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    try {
      const iso = '2026-01-05T00:00:00.000Z';
      expect(formatRelativeFromIso(iso)).toBe('in 4 days');
    } finally {
      vi.useRealTimers();
    }
  });

  test('formats a difference of a year or more in months', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    try {
      const iso = '2027-07-01T00:00:00.000Z';
      const result = formatRelativeFromIso(iso);
      expect(result).toMatch(/month/);
    } finally {
      vi.useRealTimers();
    }
  });

  test('formats a past timestamp using past-tense phrasing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:10:00.000Z'));
    try {
      const iso = '2026-01-01T00:00:00.000Z';
      expect(formatRelativeFromIso(iso)).toBe('10 minutes ago');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('fnv1a32Hex', () => {
  test('returns an 8-character lowercase hex string', () => {
    const hash = fnv1a32Hex('hello world');
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  test('is deterministic for the same input', () => {
    expect(fnv1a32Hex('same text')).toBe(fnv1a32Hex('same text'));
  });

  test('produces different hashes for different inputs', () => {
    expect(fnv1a32Hex('text a')).not.toBe(fnv1a32Hex('text b'));
  });

  test('hashes an empty string to the FNV-1a offset basis', () => {
    expect(fnv1a32Hex('')).toBe('811c9dc5');
  });
});
