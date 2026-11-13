/**
 * @description Typed persistence for agent_token_usage — the durable, aggregatable
 * per-turn token/cost fact table. Owns writes (one row per persisted assistant
 * turn) from an already-normalized {@link NormalizedTokenUsage} + turn identity.
 * Read/aggregation access for the GraphQL surface is added alongside the query
 * module (OT plan a55b76ba task 5).
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';

import { estimateAnthropicListPriceUsd } from '../../anthropic-list-price/anthropic-list-price.utils.ts';
import { CAPTURE_HEALTH_STREAMS } from '../../capture-health/capture-health.constants.ts';
import type { CaptureHealthRow } from '../../capture-health/capture-health.types.ts';
import { toCaptureHealthRows } from '../../capture-health/capture-health.utils.ts';
import { AgentTokenUsage } from './agent-token-usage.entity.ts';
import type {
  RecordTokenUsageInput,
  TokenUsageBatchResult,
  TokenUsageBatchRow,
  TokenUsageByAccount,
  TokenUsageRangeQuery,
  TokenUsageTotals,
} from './agent-token-usage.types.ts';
/** Day after `end` (YYYY-MM-DD) as an ISO instant, for a half-open [start, endExclusive) range. */
const exclusiveEndInstant = (end: string): string => {
  const date = new Date(`${end}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString();
};

/** The capture-health grouping key: the producer id, else the provider for pre-source rows. */
const CAPTURE_SOURCE_EXPRESSION = "COALESCE(NULLIF(u.source, ''), u.provider)";

/** SUM(expr) → number, coalescing NULL (no rows) to 0. */
const toNumber = (value: unknown): number => {
  return value == null ? 0 : Number(value);
};

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
      agentAccountId: input.agentAccountId,
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
      source: input.source,
      totalTokens: usage.totalTokens ?? null,
      userId: input.userId,
    });

    return this.usageRepository.save(row);
  }

  /**
   * Insert a batch of hook-ingested usage rows for `userId` in ONE multi-row
   * `INSERT … ON CONFLICT DO NOTHING RETURNING id`. Re-sending a row whose
   * `(source, session_id, request_id)` already exists is a no-op (the partial
   * unique index `uq_agent_token_usage_request`), so `inserted` is the number
   * of rows RETURNING gave back and `skipped` is the rest of the batch.
   * `created_at` is set explicitly from each row's `occurredAt`. A row that
   * reports no cost is priced at Anthropic list price when it can be priced
   * exactly (see `estimateAnthropicListPriceUsd`); a reported cost is kept as is.
   */
  async recordTokenUsageBatch(
    userId: string,
    rows: readonly TokenUsageBatchRow[],
  ): Promise<TokenUsageBatchResult> {
    if (rows.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    const result = await this.usageRepository
      .createQueryBuilder()
      .insert()
      .into(AgentTokenUsage)
      .values(
        rows.map((row) => {
          // Opaque jsonb payload: typed as `object | null` so TypeORM's
          // QueryDeepPartialEntity does not try to deep-map Record<string, unknown>.
          const rawUsage: object | null = row.rawUsage;

          return {
            agentAccountId: row.agentAccountId,
            cachedReadTokens: row.cachedReadTokens,
            cachedWriteTokens: row.cachedWriteTokens,
            costUsd: row.costUsd ?? estimateAnthropicListPriceUsd(row),
            createdAt: row.occurredAt,
            cwd: row.cwd,
            gitBranch: row.gitBranch,
            inputTokens: row.inputTokens,
            model: row.model,
            outputTokens: row.outputTokens,
            provider: row.provider,
            rawUsage,
            reasoningTokens: row.reasoningTokens,
            repoIdentity: row.repoIdentity,
            requestId: row.requestId,
            sessionId: row.sessionId,
            source: row.source,
            totalTokens: row.totalTokens,
            userId,
          };
        }),
      )
      .orIgnore()
      .returning('id')
      .execute();

    const inserted = Array.isArray(result.raw) ? result.raw.length : 0;

    return { inserted, skipped: rows.length - inserted };
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

  /**
   * The same filtered range summed per (agent account, provider), costliest
   * first. Rows with no stamped account form one unattributed bucket per
   * provider (`agentAccountId: null`).
   */
  async getUsageByAccountInRange(
    query: TokenUsageRangeQuery,
  ): Promise<TokenUsageByAccount[]> {
    const rows = await this.rangeQuery(query)
      .select('u.agent_account_id', 'agentAccountId')
      .addSelect('u.provider', 'provider')
      .addSelect('COUNT(*)', 'turnCount')
      .addSelect('COALESCE(SUM(u.input_tokens), 0)', 'inputTokens')
      .addSelect('COALESCE(SUM(u.output_tokens), 0)', 'outputTokens')
      .addSelect('COALESCE(SUM(u.cached_read_tokens), 0)', 'cachedReadTokens')
      .addSelect('COALESCE(SUM(u.cached_write_tokens), 0)', 'cachedWriteTokens')
      .addSelect('COALESCE(SUM(u.reasoning_tokens), 0)', 'reasoningTokens')
      .addSelect('COALESCE(SUM(u.total_tokens), 0)', 'totalTokens')
      .addSelect('COALESCE(SUM(u.cost_usd), 0)', 'costUsd')
      .groupBy('u.agent_account_id')
      .addGroupBy('u.provider')
      .orderBy('"costUsd"', 'DESC')
      .addOrderBy('"totalTokens"', 'DESC')
      .getRawMany<Record<string, unknown>>();

    return rows.map((raw) => {
      return {
        agentAccountId:
          typeof raw.agentAccountId === 'string' ? raw.agentAccountId : null,
        cachedReadTokens: toNumber(raw.cachedReadTokens),
        cachedWriteTokens: toNumber(raw.cachedWriteTokens),
        costUsd: toNumber(raw.costUsd),
        inputTokens: toNumber(raw.inputTokens),
        outputTokens: toNumber(raw.outputTokens),
        provider: typeof raw.provider === 'string' ? raw.provider : '',
        reasoningTokens: toNumber(raw.reasoningTokens),
        totalTokens: toNumber(raw.totalTokens),
        turnCount: toNumber(raw.turnCount),
      };
    });
  }

  /**
   * When token usage last arrived, per source. Grouped by the producer id in
   * `source`, falling back to `provider` for any row with a NULL or blank source.
   */
  async listCaptureHealth(): Promise<CaptureHealthRow[]> {
    const rows = await this.usageRepository
      .createQueryBuilder('u')
      .select(CAPTURE_SOURCE_EXPRESSION, 'source')
      .addSelect('MAX(u.created_at)', 'lastCapturedAt')
      .groupBy(CAPTURE_SOURCE_EXPRESSION)
      .orderBy(CAPTURE_SOURCE_EXPRESSION, 'ASC')
      .getRawMany<Record<string, unknown>>();

    return toCaptureHealthRows(CAPTURE_HEALTH_STREAMS.TOKEN_USAGE, rows);
  }

  /** Shared user + [start, endExclusive) + optional provider / account filter. */
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

    if (query.account?.kind === 'account') {
      qb.andWhere('u.agent_account_id = :agentAccountId', {
        agentAccountId: query.account.id,
      });
    } else if (query.account?.kind === 'unattributed') {
      qb.andWhere('u.agent_account_id IS NULL');
    }

    return qb;
  }
}
