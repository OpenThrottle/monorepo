import { describe, expect, it } from 'vitest';

import { AGENT_TOKEN_USAGE_SOURCES } from './agent-token-usage.constants.ts';
import { createAgentTokenUsageRepositoryMock } from './agent-token-usage.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const range = { end: '2026-11-18', start: '2026-11-01', userId };

describe('createAgentTokenUsageRepositoryMock', () => {
  it('starts as an empty table', async () => {
    const repository = createAgentTokenUsageRepositoryMock();

    await expect(repository.listUsageInRange(range)).resolves.toEqual([]);
    await expect(repository.getUsageByAccountInRange(range)).resolves.toEqual(
      [],
    );
    await expect(repository.listCaptureHealth()).resolves.toEqual([]);
    await expect(repository.getUsageTotalsInRange(range)).resolves.toEqual(
      expect.objectContaining({ costUsd: 0, turnCount: 0 }),
    );
  });

  it('inserts a whole batch and echoes a recorded turn', async () => {
    const repository = createAgentTokenUsageRepositoryMock();

    await expect(repository.recordTokenUsageBatch(userId, [])).resolves.toEqual(
      { inserted: 0, skipped: 0 },
    );
    await expect(
      repository.recordTurnUsage({
        agentAccountId: null,
        conversationId: null,
        messageId: null,
        model: 'm',
        provider: 'claude',
        source: AGENT_TOKEN_USAGE_SOURCES.CHAT,
        usage: { inputTokens: 3 },
        userId,
      }),
    ).resolves.toEqual(expect.objectContaining({ inputTokens: 3, userId }));
  });

  it('names the agent_token_usage table in inherited not-found errors', async () => {
    const repository = createAgentTokenUsageRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(
      'agent_token_usage record with ID "a" not found',
    );
  });
});
