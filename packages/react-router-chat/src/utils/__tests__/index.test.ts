import { describe, expect, test } from 'vitest';
import { formatChatTimestamp, formatRelativeChatTimestamp } from '../index';

describe('formatChatTimestamp', () => {
  test('should format a valid ISO string', () => {
    const result = formatChatTimestamp('2026-05-15T14:30:00.000Z');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  test('should return undefined for invalid input', () => {
    expect(formatChatTimestamp('not-a-date')).toBeUndefined();
  });
});

describe('formatRelativeChatTimestamp', () => {
  const now = new Date('2026-07-29T12:00:00.000Z').getTime();
  const at = (iso: string): string => formatRelativeChatTimestamp(iso, now);

  test('renders "just now" under a minute', () => {
    expect(at('2026-07-29T11:59:30.000Z')).toBe('just now');
  });

  test('renders minutes, hours, and days ago', () => {
    expect(at('2026-07-29T11:45:00.000Z')).toBe('15m ago');
    expect(at('2026-07-29T09:00:00.000Z')).toBe('3h ago');
    expect(at('2026-07-27T12:00:00.000Z')).toBe('2d ago');
  });

  test('falls back to an absolute date beyond a week', () => {
    // 30 days earlier — not a relative "Nd ago" label.
    expect(at('2026-06-29T12:00:00.000Z')).not.toMatch(/ago$/);
  });

  test('returns an empty string for an invalid input', () => {
    expect(at('not-a-date')).toBe('');
  });
});
