import { describe, expect, test } from 'vitest';
import {
  formatPromptDate,
  formatPromptType,
} from '~/routing/prompts/utils/formatters';

describe('routing/prompts utils formatters', () => {
  describe('formatPromptType', () => {
    test('capitalizes first letter and lowercases rest', () => {
      expect(formatPromptType('AGENTS')).toBe('Agents');
    });
  });

  describe('formatPromptDate', () => {
    test('returns a readable en-US date string including the year', () => {
      const out = formatPromptDate('2024-06-15T12:00:00.000Z');
      expect(out.length).toBeGreaterThan(4);
      expect(out).toMatch(/2024/);
    });
  });
});
