import { describe, expect, test } from 'vitest';
import { resolveTotalTokens } from '../chat-usage-counter';
import type { ChatTokenUsage } from '../../types';

describe('resolveTotalTokens', () => {
  test('returns undefined when nothing is reported', () => {
    const usage: ChatTokenUsage = {};
    expect(resolveTotalTokens(usage)).toBeUndefined();
  });

  test('returns the explicit total when present', () => {
    const usage: ChatTokenUsage = { totalTokens: 1500 };
    expect(resolveTotalTokens(usage)).toBe(1500);
  });

  test('sums input and output when total is absent', () => {
    const usage: ChatTokenUsage = { inputTokens: 100, outputTokens: 50 };
    expect(resolveTotalTokens(usage)).toBe(150);
  });

  test('treats a missing input as zero', () => {
    const usage: ChatTokenUsage = { outputTokens: 50 };
    expect(resolveTotalTokens(usage)).toBe(50);
  });

  test('treats a missing output as zero', () => {
    const usage: ChatTokenUsage = { inputTokens: 75 };
    expect(resolveTotalTokens(usage)).toBe(75);
  });

  test('prefers the explicit total even when input/output are also present', () => {
    const usage: ChatTokenUsage = {
      inputTokens: 100,
      outputTokens: 100,
      totalTokens: 999,
    };
    expect(resolveTotalTokens(usage)).toBe(999);
  });
});
