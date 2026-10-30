/**
 * @description Pure aggregation of per-turn token-usage rows into grouped
 * breakdown rows (by provider, by model within a provider, or by source:
 * chat vs Claude Code) for the Usage route. Nullable counts fold to 0; groups
 * sort by total tokens descending.
 */

import type { UsageTokenUsageRowFragment } from '~/__generated__/graphql';
import { TOKEN_USAGE_SOURCES } from '~/routing/usage/data/token-usage-copy';

/** What {@link groupTokenUsage} buckets rows by. */
export type TokenUsageGrouping = 'model' | 'provider' | 'source';

/** One breakdown row: a provider or a model with its summed usage over the range. */
export interface TokenUsageGroup {
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly costUsd: number;
  readonly inputTokens: number;
  /** Grouping key: the provider, model (`'(unknown model)'` when absent) or source id. */
  readonly key: string;
  readonly outputTokens: number;
  /** Rows in the group that reported a cost; 0 means `costUsd` is unknown, not $0. */
  readonly pricedTurnCount: number;
  readonly reasoningTokens: number;
  readonly totalTokens: number;
  readonly turnCount: number;
}

const UNKNOWN_MODEL = '(unknown model)';

/** Legacy rows written before sources were recorded (NULL or blank) are chat. */
const sourceKey = (source: string | null | undefined): string =>
  source === null || source === undefined || source.trim() === ''
    ? TOKEN_USAGE_SOURCES.CHAT
    : source;

const groupKey = (
  row: UsageTokenUsageRowFragment,
  by: TokenUsageGrouping,
): string => {
  if (by === 'provider') {
    return row.provider;
  }

  return by === 'source' ? sourceKey(row.source) : (row.model ?? UNKNOWN_MODEL);
};

const add = (value: number | null | undefined): number => value ?? 0;

/**
 * Group rows by `provider`, `model` or `source` and sum each group's counts + cost.
 * Sorted by total tokens descending (ties broken by turn count).
 */
export const groupTokenUsage = (
  rows: readonly UsageTokenUsageRowFragment[],
  by: TokenUsageGrouping,
): TokenUsageGroup[] => {
  const groups = new Map<string, TokenUsageGroup>();

  for (const row of rows) {
    const key = groupKey(row, by);
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
      pricedTurnCount:
        add(previous?.pricedTurnCount) +
        (row.costUsd === null || row.costUsd === undefined ? 0 : 1),
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
