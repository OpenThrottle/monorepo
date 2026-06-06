import { describe, expect, test } from 'vitest';
import { formatChatTimestamp } from '../index';

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
