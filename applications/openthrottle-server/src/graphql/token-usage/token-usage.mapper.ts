import type {
  AgentAccount,
  AgentTokenUsage,
  TokenUsageByAccount,
  TokenUsageTotals,
} from '@openthrottle/nestjs-repositories';

import {
  TokenUsageAccountObject,
  TokenUsageByAccountObject,
  TokenUsageRowObject,
  TokenUsageTotalsObject,
} from './token-usage.object.ts';

/** Map a persisted usage row to its GraphQL object (DB `cached_*` → client `cache*` naming). */
export const toTokenUsageRowObject = (
  row: AgentTokenUsage,
): TokenUsageRowObject => {
  const object = new TokenUsageRowObject();

  object.id = row.id;
  object.agentAccountId = row.agentAccountId;
  object.provider = row.provider;
  object.model = row.model;
  object.conversationId = row.conversationId;
  object.inputTokens = row.inputTokens;
  object.outputTokens = row.outputTokens;
  object.cacheReadTokens = row.cachedReadTokens;
  object.cacheWriteTokens = row.cachedWriteTokens;
  object.reasoningTokens = row.reasoningTokens;
  object.source = row.source;
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

/** Map an agent account row to its GraphQL object. */
export const toTokenUsageAccountObject = (
  account: AgentAccount,
): TokenUsageAccountObject => {
  const object = new TokenUsageAccountObject();

  object.id = account.id;
  object.provider = account.provider;
  object.email = account.email;
  object.orgName = account.orgName;
  object.plan = account.plan;
  object.credentialKind = account.credentialKind;
  object.lastSeenAt = account.lastSeenAt;

  return object;
};

/**
 * Map one per-account aggregate to its GraphQL object. `account` is the loaded
 * account row, or null for the unattributed bucket (or an id that no longer
 * resolves, which reads as unattributed rather than failing the query).
 */
export const toTokenUsageByAccountObject = (
  row: TokenUsageByAccount,
  account: AgentAccount | null,
): TokenUsageByAccountObject => {
  const object = new TokenUsageByAccountObject();

  object.account = account === null ? null : toTokenUsageAccountObject(account);
  object.provider = row.provider;
  object.totals = toTokenUsageTotalsObject(row);

  return object;
};
