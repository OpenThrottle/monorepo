import { describe, expect, test } from 'vitest';

import type { UsageTokenUsageRowFragment } from '~/__generated__/graphql';

import { groupTokenUsage } from '../aggregate-token-usage';

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
  source: 'openthrottle-chat',
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

  test('groups by source, folding NULL and blank sources into chat', () => {
    const groups = groupTokenUsage(
      [
        row({ id: 'a', source: 'openthrottle-chat', totalTokens: 100 }),
        row({ id: 'b', source: null, totalTokens: 50 }),
        row({ id: 'c', source: '', totalTokens: 25 }),
        row({ id: 'd', source: 'claude-code', totalTokens: 900 }),
        row({ id: 'e', source: 'some-future-tool', totalTokens: 1 }),
      ],
      'source',
    );

    expect(groups.map((group) => group.key)).toEqual([
      'claude-code',
      'openthrottle-chat',
      'some-future-tool',
    ]);
    expect(groups[1]).toMatchObject({ totalTokens: 175, turnCount: 3 });
  });

  test('counts only rows that reported a cost as priced', () => {
    const [group] = groupTokenUsage(
      [
        row({ costUsd: 0, id: 'a' }),
        row({ costUsd: 0.5, id: 'b' }),
        row({ costUsd: null, id: 'c' }),
      ],
      'provider',
    );

    expect(group).toMatchObject({ pricedTurnCount: 2, turnCount: 3 });
  });

  test('returns [] for no rows', () => {
    expect(groupTokenUsage([], 'provider')).toEqual([]);
  });
});
