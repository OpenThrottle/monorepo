import { describe, expect, test } from 'vitest';
import { buildBadgeLabel, buildRows } from '../chat-turn-usage-summary';
import type { ChatTokenUsage } from '../../types';

describe('buildRows', () => {
  test('returns an empty array when nothing is reported', () => {
    expect(buildRows({})).toEqual([]);
  });

  test('builds a row for each reported field, in order', () => {
    const usage: ChatTokenUsage = {
      cacheReadTokens: 100,
      cacheWriteTokens: 200,
      costUsd: 0.5,
      inputTokens: 1000,
      model: 'claude-sonnet-5',
      outputTokens: 500,
      totalTokens: 1800,
    };
    expect(buildRows(usage)).toEqual([
      { label: 'Input', value: '1k' },
      { label: 'Output', value: '500' },
      { label: 'Cache read', value: '100' },
      { label: 'Cache write', value: '200' },
      { label: 'Total', value: '1.8k' },
      { label: 'Cost', value: '$0.500' },
      { label: 'Model', value: 'claude-sonnet-5' },
    ]);
  });

  test('omits fields that are undefined', () => {
    const usage: ChatTokenUsage = { inputTokens: 42 };
    expect(buildRows(usage)).toEqual([{ label: 'Input', value: '42' }]);
  });
});

describe('buildBadgeLabel', () => {
  test('returns an empty string when nothing is reported', () => {
    expect(buildBadgeLabel({})).toBe('');
  });

  test('renders input/output arrows when both are present', () => {
    const usage: ChatTokenUsage = { inputTokens: 1200, outputTokens: 340 };
    expect(buildBadgeLabel(usage)).toBe('↑ 1.2k · ↓ 340');
  });

  test('renders only the input arrow when output is absent', () => {
    const usage: ChatTokenUsage = { inputTokens: 100 };
    expect(buildBadgeLabel(usage)).toBe('↑ 100');
  });

  test('falls back to total when neither input nor output is present', () => {
    const usage: ChatTokenUsage = { totalTokens: 5000 };
    expect(buildBadgeLabel(usage)).toBe('Σ 5k');
  });

  test('falls back to cost when no token counts are present', () => {
    const usage: ChatTokenUsage = { costUsd: 2.5 };
    expect(buildBadgeLabel(usage)).toBe('$2.50');
  });

  test('prefers input/output over total and cost', () => {
    const usage: ChatTokenUsage = {
      costUsd: 2.5,
      inputTokens: 10,
      totalTokens: 999,
    };
    expect(buildBadgeLabel(usage)).toBe('↑ 10');
  });
});
