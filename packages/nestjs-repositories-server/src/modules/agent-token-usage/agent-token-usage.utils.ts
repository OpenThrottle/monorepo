import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { AgentTokenUsage } from './agent-token-usage.entity.ts';
import type { AgentTokenUsageRepository } from './agent-token-usage.repository.ts';
import type { AgentTokenUsageRepositoryMock } from './agent-token-usage.types.ts';

/**
 * @description Builds an {@link AgentTokenUsageRepositoryMock} that starts as an empty
 * `agent_token_usage` table (see `createBaseRepositoryMock`): range reads and capture health are
 * empty, totals are all zero, a batch ingest inserts every row it is given, and `recordTurnUsage`
 * echoes the turn back as a saved row. Provide it in place of `AgentTokenUsageRepository` and stub
 * per test. Test-only: imports `vitest`.
 * @public
 */
export function createAgentTokenUsageRepositoryMock(): AgentTokenUsageRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      AgentTokenUsage,
      CreateModelInput<AgentTokenUsage>
    >('agent_token_usage'),
    getUsageByAccountInRange: vi.fn(async () => {
      return [];
    }),
    getUsageTotalsInRange: vi.fn(async () => {
      return {
        cachedReadTokens: 0,
        cachedWriteTokens: 0,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        turnCount: 0,
      };
    }),
    listCaptureHealth: vi.fn(async () => {
      return [];
    }),
    listUsageInRange: vi.fn(async () => {
      return [];
    }),
    recordTokenUsageBatch: vi.fn<
      AgentTokenUsageRepository['recordTokenUsageBatch']
    >(async (_userId, rows) => {
      return { inserted: rows.length, skipped: 0 };
    }),
    recordTurnUsage: vi.fn<AgentTokenUsageRepository['recordTurnUsage']>(
      async (input) => {
        const { usage } = input;
        const row: AgentTokenUsage = {
          agentAccountId: input.agentAccountId,
          cachedReadTokens: usage.cacheReadTokens ?? null,
          cachedWriteTokens: usage.cacheWriteTokens ?? null,
          conversationId: input.conversationId,
          costUsd: usage.costUsd ?? null,
          createdAt: new Date(),
          cwd: null,
          gitBranch: null,
          id: 'agent-token-usage-mock',
          inputTokens: usage.inputTokens ?? null,
          messageId: input.messageId,
          model: input.model,
          outputTokens: usage.outputTokens ?? null,
          provider: input.provider,
          rawUsage: { ...usage },
          reasoningTokens: usage.reasoningTokens ?? null,
          repoIdentity: null,
          requestId: null,
          sessionId: null,
          source: input.source,
          totalTokens: usage.totalTokens ?? null,
          userId: input.userId,
        };

        return row;
      },
    ),
  };
}
