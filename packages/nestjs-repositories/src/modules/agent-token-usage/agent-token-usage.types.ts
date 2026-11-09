import type { NormalizedTokenUsage } from '@openthrottle/agentic-token-usage';

/**
 * A normalized usage row to persist: the folded {@link NormalizedTokenUsage} for
 * a turn plus its identity (owner, source conversation/message, provider, model).
 * Conversation/message are nullable so non-chat sources can write too.
 */
export interface RecordTokenUsageInput {
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
 */
export interface TokenUsageBatchRow {
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
  readonly requestId: string | null;
  readonly sessionId: string | null;
  readonly source: string;
  readonly totalTokens: number | null;
}

/** Outcome of a batch ingest: rows written vs rows the unique index skipped. */
export interface TokenUsageBatchResult {
  readonly inserted: number;
  readonly skipped: number;
}

/**
 * A user-scoped read over a date range: the caller's usage rows between `start`
 * and `end` (both YYYY-MM-DD, inclusive), optionally narrowed to one `provider`.
 */
export interface TokenUsageRangeQuery {
  readonly end: string;
  readonly provider?: string | null;
  readonly start: string;
  readonly userId: string;
}

/** Summed usage over a range plus the number of turns contributing. */
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
