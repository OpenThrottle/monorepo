import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi } from 'vitest';

import { AgentTokenUsage } from './agent-token-usage.entity.ts';
import { AgentTokenUsageService } from './agent-token-usage.service.ts';

describe('AgentTokenUsageService', () => {
  // Plain untyped mock repo (provided as `useValue`) so the vi.fn stand-ins for
  // TypeORM's overloaded create/save are not type-checked against those
  // signatures — mirrors the other repository service tests.
  const buildService = async (mockRepo: {
    create: ReturnType<typeof vi.fn>;
    createQueryBuilder?: ReturnType<typeof vi.fn>;
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

  describe('listCaptureHealth', () => {
    const buildHealthService = async (
      getRawMany: ReturnType<typeof vi.fn>,
    ): Promise<{
      qb: Record<string, ReturnType<typeof vi.fn>>;
      service: AgentTokenUsageService;
    }> => {
      const qb: Record<string, ReturnType<typeof vi.fn>> = {
        addSelect: vi.fn(),
        getRawMany,
        groupBy: vi.fn(),
        orderBy: vi.fn(),
        select: vi.fn(),
      };
      for (const key of ['addSelect', 'groupBy', 'orderBy', 'select']) {
        qb[key]?.mockReturnValue(qb);
      }
      const service = await buildService({
        create: vi.fn(),
        createQueryBuilder: vi.fn().mockReturnValue(qb),
        save: vi.fn(),
      });

      return { qb, service };
    };

    it('maps providers to token_usage rows with their latest created_at', async () => {
      const lastCapturedAt = new Date('2026-10-29T10:00:00.000Z');
      const { service } = await buildHealthService(
        vi.fn().mockResolvedValue([{ lastCapturedAt, source: 'claude' }]),
      );

      await expect(service.listCaptureHealth()).resolves.toEqual([
        { lastCapturedAt, source: 'claude', stream: 'token_usage' },
      ]);
    });

    it('selects MAX(created_at) grouped by provider', async () => {
      const { qb, service } = await buildHealthService(
        vi.fn().mockResolvedValue([]),
      );

      await service.listCaptureHealth();

      expect(qb.select).toHaveBeenCalledWith('u.provider', 'source');
      expect(qb.addSelect).toHaveBeenCalledWith(
        'MAX(u.created_at)',
        'lastCapturedAt',
      );
      expect(qb.groupBy).toHaveBeenCalledWith('u.provider');
    });

    describe('when no usage has been recorded', () => {
      it('returns no rows', async () => {
        const { service } = await buildHealthService(
          vi.fn().mockResolvedValue([]),
        );

        await expect(service.listCaptureHealth()).resolves.toEqual([]);
      });
    });
  });
});
