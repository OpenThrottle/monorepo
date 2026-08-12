import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { formatRelativeTime, formatSeverityToColor } from '../formatters';

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-08-12T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns "just now" for timestamps less than a minute old', () => {
    const iso = new Date(NOW.getTime() - 30 * 1000).toISOString();

    expect(formatRelativeTime(iso)).toBe('just now');
  });

  test('returns "just now" for the current instant (boundary)', () => {
    expect(formatRelativeTime(NOW.toISOString())).toBe('just now');
  });

  test('formats minutes ago for timestamps under an hour old', () => {
    const iso = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();

    expect(formatRelativeTime(iso)).toBe('5m ago');
  });

  test('formats hours ago for timestamps under a day old', () => {
    const iso = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString();

    expect(formatRelativeTime(iso)).toBe('3h ago');
  });

  test('formats days ago for timestamps under a week old', () => {
    const iso = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

    expect(formatRelativeTime(iso)).toBe('2d ago');
  });

  test('falls back to a localized date for timestamps a week or older', () => {
    const d = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000);

    expect(formatRelativeTime(d.toISOString())).toBe(d.toLocaleDateString());
  });
});

describe('formatSeverityToColor', () => {
  test('maps error severity to the destructive class', () => {
    expect(formatSeverityToColor('error')).toBe('bg-destructive');
  });

  test('maps info severity to yellow', () => {
    expect(formatSeverityToColor('info')).toBe('bg-yellow-500');
  });

  test('maps success severity to green', () => {
    expect(formatSeverityToColor('success')).toBe('bg-green-500');
  });

  test('maps warning severity to amber', () => {
    expect(formatSeverityToColor('warning')).toBe('bg-amber-500');
  });
});
