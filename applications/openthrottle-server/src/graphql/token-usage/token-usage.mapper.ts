import type {
  AgentTokenUsage,
  TokenUsageTotals,
} from '@openthrottle/nestjs-repositories';
import {
  TokenUsageRowObject,
  TokenUsageTotalsObject,
} from './token-usage.object';

/** Map a persisted usage row to its GraphQL object (DB `cached_*` → client `cache*` naming). */
export const toTokenUsageRowObject = (
  row: AgentTokenUsage,
): TokenUsageRowObject => {
  const object = new TokenUsageRowObject();

  object.id = row.id;
  object.provider = row.provider;
  object.model = row.model;
  object.conversationId = row.conversationId;
  object.inputTokens = row.inputTokens;
  object.outputTokens = row.outputTokens;
  object.cacheReadTokens = row.cachedReadTokens;
  object.cacheWriteTokens = row.cachedWriteTokens;
  object.reasoningTokens = row.reasoningTokens;
  object.totalTokens = row.totalTokens;
  object.costUsd = row.costUsd;
  object.createdAt = row.createdAt;

  return object;
};

/** Map the repository totals aggregate to its GraphQL object. */
export const toTokenUsageTotalsObject = (
  totals: TokenUsageTotals,
): TokenUsageTotalsObject => {
  const object = new TokenUsageTotalsObject();

  object.inputTokens = totals.inputTokens;
  object.outputTokens = totals.outputTokens;
  object.cacheReadTokens = totals.cachedReadTokens;
  object.cacheWriteTokens = totals.cachedWriteTokens;
  object.reasoningTokens = totals.reasoningTokens;
  object.totalTokens = totals.totalTokens;
  object.costUsd = totals.costUsd;
  object.turnCount = totals.turnCount;

  return object;
};
