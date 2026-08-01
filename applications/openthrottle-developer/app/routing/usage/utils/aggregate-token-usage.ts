/**
 * @description Pure aggregation of per-turn token-usage rows into grouped
 * breakdown rows (by provider, or by model within a provider) for the Usage
 * route. Nullable counts fold to 0; groups sort by total tokens descending.
 */

import type { UsageTokenUsageRowFragment } from '~/__generated__/graphql';

/** One breakdown row: a provider or a model with its summed usage over the range. */
export interface TokenUsageGroup {
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly costUsd: number;
  readonly inputTokens: number;
  /** Grouping key: the provider id or model id (`'(unknown model)'` when absent). */
  readonly key: string;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
  readonly totalTokens: number;
  readonly turnCount: number;
}

const UNKNOWN_MODEL = '(unknown model)';

const add = (value: number | null | undefined): number => value ?? 0;

/**
 * Group rows by `provider` or `model` and sum each group's counts + cost.
 * Sorted by total tokens descending (ties broken by turn count).
 */
export const groupTokenUsage = (
  rows: readonly UsageTokenUsageRowFragment[],
  by: 'model' | 'provider',
): TokenUsageGroup[] => {
  const groups = new Map<string, TokenUsageGroup>();

  for (const row of rows) {
    const key = by === 'provider' ? row.provider : (row.model ?? UNKNOWN_MODEL);
    const previous = groups.get(key);

    groups.set(key, {
      cacheReadTokens:
        add(previous?.cacheReadTokens) + add(row.cacheReadTokens),
      cacheWriteTokens:
        add(previous?.cacheWriteTokens) + add(row.cacheWriteTokens),
      costUsd: add(previous?.costUsd) + add(row.costUsd),
      inputTokens: add(previous?.inputTokens) + add(row.inputTokens),
      key,
      outputTokens: add(previous?.outputTokens) + add(row.outputTokens),
      reasoningTokens:
        add(previous?.reasoningTokens) + add(row.reasoningTokens),
      totalTokens: add(previous?.totalTokens) + add(row.totalTokens),
      turnCount: add(previous?.turnCount) + 1,
    });
  }

  return [...groups.values()].sort(
    (a, b) => b.totalTokens - a.totalTokens || b.turnCount - a.turnCount,
  );
};
