import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi } from 'vitest';
import { AgentTokenUsage } from './agent-token-usage.entity';
import { AgentTokenUsageService } from './agent-token-usage.service';

describe('AgentTokenUsageService', () => {
  // Plain untyped mock repo (provided as `useValue`) so the vi.fn stand-ins for
  // TypeORM's overloaded create/save are not type-checked against those
  // signatures — mirrors the other repository service tests.
  const buildService = async (mockRepo: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  }): Promise<AgentTokenUsageService> => {
    const app = await Test.createTestingModule({
      providers: [
        AgentTokenUsageService,
        { provide: getRepositoryToken(AgentTokenUsage), useValue: mockRepo },
      ],
    }).compile();

    return app.get<AgentTokenUsageService>(AgentTokenUsageService);
  };

  it('maps a full NormalizedTokenUsage + identity to a row, retaining raw_usage', async () => {
    // create() echoes its input; save() echoes with an id.
    const create = vi.fn((input: Partial<AgentTokenUsage>) => input);
    const save = vi.fn((row: Partial<AgentTokenUsage>) =>
      Promise.resolve({ ...row, id: 'usage-1' }),
    );
    const service = await buildService({ create, save });

    const saved = await service.recordTurnUsage({
      conversationId: 'conv-1',
      messageId: 'msg-1',
      model: 'claude-opus-4-8',
      provider: 'claude',
      usage: {
        cacheReadTokens: 900,
        cacheWriteTokens: 300,
        costUsd: 0.042,
        inputTokens: 1200,
        model: 'claude-opus-4-8',
        outputTokens: 340,
        totalTokens: 1540,
      },
      userId: 'user-1',
    });

    expect(create).toHaveBeenCalledWith({
      cachedReadTokens: 900,
      cachedWriteTokens: 300,
      conversationId: 'conv-1',
      costUsd: 0.042,
      inputTokens: 1200,
      messageId: 'msg-1',
      model: 'claude-opus-4-8',
      outputTokens: 340,
      provider: 'claude',
      rawUsage: {
        cacheReadTokens: 900,
        cacheWriteTokens: 300,
        costUsd: 0.042,
        inputTokens: 1200,
        model: 'claude-opus-4-8',
        outputTokens: 340,
        totalTokens: 1540,
      },
      reasoningTokens: null,
      totalTokens: 1540,
      userId: 'user-1',
    });
    expect(saved.id).toBe('usage-1');
  });

  it('nulls every absent usage count and keeps nullable identity fields', async () => {
    const create = vi.fn((input: Partial<AgentTokenUsage>) => input);
    const save = vi.fn((row: Partial<AgentTokenUsage>) =>
      Promise.resolve({ ...row, id: 'usage-2' }),
    );
    const service = await buildService({ create, save });

    await service.recordTurnUsage({
      conversationId: null,
      messageId: null,
      model: null,
      provider: 'openai',
      usage: { outputTokens: 35, totalTokens: 35 },
      userId: 'user-9',
    });

    expect(create).toHaveBeenCalledWith({
      cachedReadTokens: null,
      cachedWriteTokens: null,
      conversationId: null,
      costUsd: null,
      inputTokens: null,
      messageId: null,
      model: null,
      outputTokens: 35,
      provider: 'openai',
      rawUsage: { outputTokens: 35, totalTokens: 35 },
      reasoningTokens: null,
      totalTokens: 35,
      userId: 'user-9',
    });
  });
});
