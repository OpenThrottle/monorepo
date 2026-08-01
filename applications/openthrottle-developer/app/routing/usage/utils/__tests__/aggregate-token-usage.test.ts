import { describe, expect, test } from 'vitest';
import { groupTokenUsage } from '../aggregate-token-usage';
import type { UsageTokenUsageRowFragment } from '~/__generated__/graphql';

const row = (
  overrides: Partial<UsageTokenUsageRowFragment>,
): UsageTokenUsageRowFragment => ({
  cacheReadTokens: null,
  cacheWriteTokens: null,
  costUsd: null,
  createdAt: '2026-07-15T00:00:00.000Z',
  id: 'r',
  inputTokens: null,
  model: null,
  outputTokens: null,
  provider: 'claude',
  reasoningTokens: null,
  totalTokens: null,
  ...overrides,
});

describe('groupTokenUsage', () => {
  test('groups by provider, sums counts (null → 0), sorts by total desc', () => {
    const groups = groupTokenUsage(
      [
        row({
          id: 'a',
          inputTokens: 100,
          provider: 'openai',
          totalTokens: 120,
        }),
        row({ costUsd: 0.02, id: 'b', provider: 'claude', totalTokens: 900 }),
        row({ id: 'c', inputTokens: 50, provider: 'claude', totalTokens: 100 }),
      ],
      'provider',
    );

    expect(groups.map((group) => group.key)).toEqual(['claude', 'openai']);
    expect(groups[0]).toMatchObject({
      costUsd: 0.02,
      inputTokens: 50,
      key: 'claude',
      totalTokens: 1000,
      turnCount: 2,
    });
    expect(groups[1]).toMatchObject({ key: 'openai', turnCount: 1 });
  });

  test('groups by model, labeling absent models', () => {
    const groups = groupTokenUsage(
      [
        row({ id: 'a', model: 'claude-opus-4-8', totalTokens: 10 }),
        row({ id: 'b', model: null, totalTokens: 5 }),
      ],
      'model',
    );

    expect(groups.map((group) => group.key)).toEqual([
      'claude-opus-4-8',
      '(unknown model)',
    ]);
  });

  test('returns [] for no rows', () => {
    expect(groupTokenUsage([], 'provider')).toEqual([]);
  });
});
