/**
 * @description Typed persistence for agent_token_usage — the durable, aggregatable
 * per-turn token/cost fact table. Owns writes (one row per persisted assistant
 * turn) from an already-normalized {@link NormalizedTokenUsage} + turn identity.
 * Read/aggregation access for the GraphQL surface is added alongside the query
 * module (OT plan a55b76ba task 5).
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { NormalizedTokenUsage } from '@openthrottle/agentic-token-usage';
import { Repository, type SelectQueryBuilder } from 'typeorm';
import { AgentTokenUsage } from './agent-token-usage.entity';

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
  readonly usage: NormalizedTokenUsage;
  readonly userId: string;
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

/** Day after `end` (YYYY-MM-DD) as an ISO instant, for a half-open [start, endExclusive) range. */
const exclusiveEndInstant = (end: string): string => {
  const date = new Date(`${end}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString();
};

/** SUM(expr) → number, coalescing NULL (no rows) to 0. */
const toNumber = (value: unknown): number =>
  value == null ? 0 : Number(value);

@Injectable()
export class AgentTokenUsageService {
  constructor(
    @InjectRepository(AgentTokenUsage)
    private readonly usageRepository: Repository<AgentTokenUsage>,
  ) {}

  /** The underlying repository, for read/aggregate access by consumers. */
  getRepository(): Repository<AgentTokenUsage> {
    return this.usageRepository;
  }

  /**
   * Insert one usage row for a completed turn. `usage` is already normalized and
   * summed (e.g. opencode's mid-stream chunks folded into one). The full
   * normalized payload is retained in `raw_usage` for audit. Returns the saved row.
   */
  async recordTurnUsage(
    input: RecordTokenUsageInput,
  ): Promise<AgentTokenUsage> {
    const { usage } = input;

    const row = this.usageRepository.create({
      cachedReadTokens: usage.cacheReadTokens ?? null,
      cachedWriteTokens: usage.cacheWriteTokens ?? null,
      conversationId: input.conversationId,
      costUsd: usage.costUsd ?? null,
      inputTokens: usage.inputTokens ?? null,
      messageId: input.messageId,
      model: input.model,
      outputTokens: usage.outputTokens ?? null,
      provider: input.provider,
      rawUsage: { ...usage },
      reasoningTokens: usage.reasoningTokens ?? null,
      totalTokens: usage.totalTokens ?? null,
      userId: input.userId,
    });

    return this.usageRepository.save(row);
  }

  /**
   * The caller's usage rows in `[start, end]` (inclusive days), newest first,
   * optionally narrowed to one provider. Served by the (user_id, created_at) /
   * (user_id, provider, created_at) indexes.
   */
  listUsageInRange(query: TokenUsageRangeQuery): Promise<AgentTokenUsage[]> {
    return this.rangeQuery(query).orderBy('u.created_at', 'DESC').getMany();
  }

  /**
   * SUM of the caller's usage over the same filtered range, plus the turn count.
   * Computed in SQL so it stays correct as row volume grows.
   */
  async getUsageTotalsInRange(
    query: TokenUsageRangeQuery,
  ): Promise<TokenUsageTotals> {
    const raw = await this.rangeQuery(query)
      .select('COUNT(*)', 'turnCount')
      .addSelect('COALESCE(SUM(u.input_tokens), 0)', 'inputTokens')
      .addSelect('COALESCE(SUM(u.output_tokens), 0)', 'outputTokens')
      .addSelect('COALESCE(SUM(u.cached_read_tokens), 0)', 'cachedReadTokens')
      .addSelect('COALESCE(SUM(u.cached_write_tokens), 0)', 'cachedWriteTokens')
      .addSelect('COALESCE(SUM(u.reasoning_tokens), 0)', 'reasoningTokens')
      .addSelect('COALESCE(SUM(u.total_tokens), 0)', 'totalTokens')
      .addSelect('COALESCE(SUM(u.cost_usd), 0)', 'costUsd')
      .getRawOne<Record<string, unknown>>();

    return {
      cachedReadTokens: toNumber(raw?.cachedReadTokens),
      cachedWriteTokens: toNumber(raw?.cachedWriteTokens),
      costUsd: toNumber(raw?.costUsd),
      inputTokens: toNumber(raw?.inputTokens),
      outputTokens: toNumber(raw?.outputTokens),
      reasoningTokens: toNumber(raw?.reasoningTokens),
      totalTokens: toNumber(raw?.totalTokens),
      turnCount: toNumber(raw?.turnCount),
    };
  }

  /** Shared user + [start, endExclusive) + optional-provider filter. */
  private rangeQuery(
    query: TokenUsageRangeQuery,
  ): SelectQueryBuilder<AgentTokenUsage> {
    const qb = this.usageRepository
      .createQueryBuilder('u')
      .where('u.user_id = :userId', { userId: query.userId })
      .andWhere('u.created_at >= :start', { start: query.start })
      .andWhere('u.created_at < :endExclusive', {
        endExclusive: exclusiveEndInstant(query.end),
      });

    if (query.provider != null && query.provider !== '') {
      qb.andWhere('u.provider = :provider', { provider: query.provider });
    }

    return qb;
  }
}
