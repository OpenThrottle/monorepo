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
import { Repository } from 'typeorm';
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
}
