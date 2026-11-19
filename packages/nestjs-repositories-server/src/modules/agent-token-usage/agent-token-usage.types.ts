/**
 * @description Types for agent_token_usage (migrations 083, 135, 158, 161, 180) shared by
 * AgentTokenUsageRepository and its callers.
 */

import type { NormalizedTokenUsage } from '@openthrottle/agentic-token-usage';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { AGENT_TOKEN_USAGE_SOURCES } from './agent-token-usage.constants.ts';
import type { AgentTokenUsage } from './agent-token-usage.entity.ts';
import type { AgentTokenUsageRepository } from './agent-token-usage.repository.ts';

/** @public */
export type AgentTokenUsageSource =
  (typeof AGENT_TOKEN_USAGE_SOURCES)[keyof typeof AGENT_TOKEN_USAGE_SOURCES];

/**
 * A normalized usage row to persist: the folded {@link NormalizedTokenUsage} for
 * a turn plus its identity (owner, source conversation/message, provider, model).
 * Conversation/message are nullable so non-chat sources can write too.
 * @public
 */
export interface RecordTokenUsageInput {
  /** agent_accounts row the turn was billed to, stamped at write time; null when unidentified. */
  readonly agentAccountId: string | null;
  readonly conversationId: string | null;
  readonly messageId: string | null;
  readonly model: string | null;
  readonly provider: string;
  /** Producer id for `agent_token_usage.source`; see AGENT_TOKEN_USAGE_SOURCES. */
  readonly source: string;
  readonly usage: NormalizedTokenUsage;
  readonly userId: string;
}

/**
 * One hook-ingested usage row (Claude Code transcript line). `occurredAt` is
 * the event time from the transcript and becomes `created_at`, so a late JSONL
 * drain lands on the day the turn actually ran, not the day it was ingested.
 * @public
 */
export interface TokenUsageBatchRow {
  /** agent_accounts row the turn was billed to, stamped at write time; null when unidentified. */
  readonly agentAccountId: string | null;
  readonly cachedReadTokens: number | null;
  readonly cachedWriteTokens: number | null;
  readonly costUsd: number | null;
  readonly cwd: string | null;
  readonly gitBranch: string | null;
  readonly inputTokens: number | null;
  readonly model: string;
  readonly occurredAt: Date;
  readonly outputTokens: number | null;
  readonly provider: string;
  readonly rawUsage: Record<string, unknown> | null;
  readonly reasoningTokens: number | null;
  /** Normalized git remote (normalizeRemoteUrl output), or null. */
  readonly repoIdentity: string | null;
  readonly requestId: string | null;
  readonly sessionId: string | null;
  readonly source: string;
  readonly totalTokens: number | null;
}

/**
 * @description Outcome of a batch ingest: rows written vs rows the unique index skipped.
 * @public
 */
export interface TokenUsageBatchResult {
  readonly inserted: number;
  readonly skipped: number;
}

/**
 * Narrow a range read to one agent account, or to the rows no account was
 * stamped on.
 * @public
 */
export type TokenUsageAccountFilter =
  | { readonly id: string; readonly kind: 'account' }
  | { readonly kind: 'unattributed' };

/**
 * A user-scoped read over a date range: the caller's usage rows between `start`
 * and `end` (both YYYY-MM-DD, inclusive), optionally narrowed to one `provider`
 * and/or one agent account.
 * @public
 */
export interface TokenUsageRangeQuery {
  readonly account?: TokenUsageAccountFilter | null;
  readonly end: string;
  readonly provider?: string | null;
  readonly start: string;
  readonly userId: string;
}

/**
 * @description Summed usage over a range plus the number of turns contributing.
 * @public
 */
export interface TokenUsageTotals {
  readonly cachedReadTokens: number;
  readonly cachedWriteTokens: number;
  readonly costUsd: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
  readonly totalTokens: number;
  readonly turnCount: number;
}

/**
 * Summed usage for one (agent account, provider) pair over a range. A null
 * `agentAccountId` is the unattributed bucket for that provider.
 * @public
 */
export interface TokenUsageByAccount extends TokenUsageTotals {
  readonly agentAccountId: string | null;
  readonly provider: string;
}

/**
 * @description An {@link AgentTokenUsageRepository} mock: every inherited `BaseRepository`
 * method plus the usage ones.
 * @public
 */
export interface AgentTokenUsageRepositoryMock extends BaseRepositoryMock<
  AgentTokenUsage,
  CreateModelInput<AgentTokenUsage>
> {
  readonly getUsageByAccountInRange: Mock<
    AgentTokenUsageRepository['getUsageByAccountInRange']
  >;
  readonly getUsageTotalsInRange: Mock<
    AgentTokenUsageRepository['getUsageTotalsInRange']
  >;
  readonly listCaptureHealth: Mock<
    AgentTokenUsageRepository['listCaptureHealth']
  >;
  readonly listUsageInRange: Mock<
    AgentTokenUsageRepository['listUsageInRange']
  >;
  readonly recordTokenUsageBatch: Mock<
    AgentTokenUsageRepository['recordTokenUsageBatch']
  >;
  readonly recordTurnUsage: Mock<AgentTokenUsageRepository['recordTurnUsage']>;
}
