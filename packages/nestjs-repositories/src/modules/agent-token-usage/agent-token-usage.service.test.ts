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
      agentAccountId: 'account-1',
      conversationId: 'conv-1',
      messageId: 'msg-1',
      model: 'claude-opus-4-8',
      provider: 'claude',
      source: 'openthrottle-chat',
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
      agentAccountId: 'account-1',
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
      source: 'openthrottle-chat',
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
      agentAccountId: null,
      conversationId: null,
      messageId: null,
      model: null,
      provider: 'openai',
      source: 'openthrottle-chat',
      usage: { outputTokens: 35, totalTokens: 35 },
      userId: 'user-9',
    });

    expect(create).toHaveBeenCalledWith({
      agentAccountId: null,
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
      source: 'openthrottle-chat',
      totalTokens: 35,
      userId: 'user-9',
    });
  });

  describe('recordTokenUsageBatch', () => {
    const occurredAt = new Date('2026-10-01T08:30:00.000Z');
    const batchRow = {
      agentAccountId: 'account-1',
      cachedReadTokens: 900,
      cachedWriteTokens: 300,
      costUsd: null,
      cwd: '/work/repo',
      gitBranch: 'main',
      inputTokens: 1200,
      model: 'claude-opus-4-8',
      occurredAt,
      outputTokens: 340,
      provider: 'claude',
      rawUsage: { service_tier: 'standard' },
      reasoningTokens: null,
      requestId: 'req-1',
      sessionId: 'sess-1',
      source: 'claude-code',
      totalTokens: 2740,
    };

    const buildBatchService = async (
      raw: unknown,
    ): Promise<{
      qb: Record<string, ReturnType<typeof vi.fn>>;
      service: AgentTokenUsageService;
    }> => {
      const qb: Record<string, ReturnType<typeof vi.fn>> = {
        execute: vi.fn().mockResolvedValue({ raw }),
        insert: vi.fn(),
        into: vi.fn(),
        orIgnore: vi.fn(),
        returning: vi.fn(),
        values: vi.fn(),
      };
      for (const key of ['insert', 'into', 'orIgnore', 'returning', 'values']) {
        qb[key]?.mockReturnValue(qb);
      }
      const service = await buildService({
        create: vi.fn(),
        createQueryBuilder: vi.fn().mockReturnValue(qb),
        save: vi.fn(),
      });

      return { qb, service };
    };

    it('inserts one multi-row ON CONFLICT DO NOTHING statement keyed to the user', async () => {
      const { qb, service } = await buildBatchService([{ id: 'a' }]);

      await service.recordTokenUsageBatch('user-1', [batchRow]);

      expect(qb.orIgnore).toHaveBeenCalledOnce();
      expect(qb.returning).toHaveBeenCalledWith('id');
      expect(qb.execute).toHaveBeenCalledOnce();
      expect(qb.values).toHaveBeenCalledWith([
        {
          agentAccountId: 'account-1',
          cachedReadTokens: 900,
          cachedWriteTokens: 300,
          costUsd: null,
          createdAt: occurredAt,
          cwd: '/work/repo',
          gitBranch: 'main',
          inputTokens: 1200,
          model: 'claude-opus-4-8',
          outputTokens: 340,
          provider: 'claude',
          rawUsage: { service_tier: 'standard' },
          reasoningTokens: null,
          requestId: 'req-1',
          sessionId: 'sess-1',
          source: 'claude-code',
          totalTokens: 2740,
          userId: 'user-1',
        },
      ]);
    });

    describe('when a row reports no cost', () => {
      const pricedUsage = {
        cache_creation: {
          ephemeral_1h_input_tokens: 0,
          ephemeral_5m_input_tokens: 300,
        },
        cache_creation_input_tokens: 300,
        cache_read_input_tokens: 900,
        input_tokens: 1200,
        output_tokens: 340,
      };

      it('stores the list-price estimate for a priced model', async () => {
        const { qb, service } = await buildBatchService([{ id: 'a' }]);

        await service.recordTokenUsageBatch('user-1', [
          { ...batchRow, model: 'claude-opus-5-5', rawUsage: pricedUsage },
        ]);

        // Opus 5.5: 1200×4 + 340×20 + 900×0.2 + 300×5 ($/MTok).
        expect(qb.values).toHaveBeenCalledWith([
          expect.objectContaining({
            costUsd: expect.closeTo(
              (1200 * 4 + 340 * 20 + 900 * 0.2 + 300 * 5) / 1e6,
              10,
            ),
          }),
        ]);
      });
    });

    describe('when a row reports a cost', () => {
      it('keeps the reported cost instead of estimating one', async () => {
        const { qb, service } = await buildBatchService([{ id: 'a' }]);

        await service.recordTokenUsageBatch('user-1', [
          {
            ...batchRow,
            costUsd: 0.42,
            model: 'claude-opus-5-5',
            rawUsage: { input_tokens: 1, output_tokens: 1 },
          },
        ]);

        expect(qb.values).toHaveBeenCalledWith([
          expect.objectContaining({ costUsd: 0.42 }),
        ]);
      });
    });

    it('counts RETURNING rows as inserted and the rest of the batch as skipped', async () => {
      const { service } = await buildBatchService([{ id: 'a' }, { id: 'b' }]);

      await expect(
        service.recordTokenUsageBatch('user-1', [
          batchRow,
          { ...batchRow, requestId: 'req-2' },
          { ...batchRow, requestId: 'req-3' },
        ]),
      ).resolves.toEqual({ inserted: 2, skipped: 1 });
    });

    describe('when every row conflicts', () => {
      it('inserts none and skips the whole batch', async () => {
        const { service } = await buildBatchService([]);

        await expect(
          service.recordTokenUsageBatch('user-1', [batchRow, batchRow]),
        ).resolves.toEqual({ inserted: 0, skipped: 2 });
      });
    });

    describe('when the batch is empty', () => {
      it('skips the database round trip', async () => {
        const { qb, service } = await buildBatchService([]);

        await expect(
          service.recordTokenUsageBatch('user-1', []),
        ).resolves.toEqual({ inserted: 0, skipped: 0 });
        expect(qb.execute).not.toHaveBeenCalled();
      });
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

    it('maps sources to token_usage rows with their latest created_at', async () => {
      const lastCapturedAt = new Date('2026-10-29T10:00:00.000Z');
      const { service } = await buildHealthService(
        vi.fn().mockResolvedValue([{ lastCapturedAt, source: 'claude' }]),
      );

      await expect(service.listCaptureHealth()).resolves.toEqual([
        { lastCapturedAt, source: 'claude', stream: 'token_usage' },
      ]);
    });

    it('selects MAX(created_at) grouped by source, falling back to provider', async () => {
      const { qb, service } = await buildHealthService(
        vi.fn().mockResolvedValue([]),
      );

      await service.listCaptureHealth();

      const sourceExpression = "COALESCE(NULLIF(u.source, ''), u.provider)";

      expect(qb.select).toHaveBeenCalledWith(sourceExpression, 'source');
      expect(qb.addSelect).toHaveBeenCalledWith(
        'MAX(u.created_at)',
        'lastCapturedAt',
      );
      expect(qb.groupBy).toHaveBeenCalledWith(sourceExpression);
      expect(qb.orderBy).toHaveBeenCalledWith(sourceExpression, 'ASC');
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

  describe('range reads by account', () => {
    const range = { end: '2026-11-30', start: '2026-11-01', userId: 'user-1' };

    const buildRangeService = async (
      getRawMany: ReturnType<typeof vi.fn>,
    ): Promise<{
      qb: Record<string, ReturnType<typeof vi.fn>>;
      service: AgentTokenUsageService;
    }> => {
      const qb: Record<string, ReturnType<typeof vi.fn>> = {
        addGroupBy: vi.fn(),
        addOrderBy: vi.fn(),
        addSelect: vi.fn(),
        andWhere: vi.fn(),
        getRawMany,
        groupBy: vi.fn(),
        orderBy: vi.fn(),
        select: vi.fn(),
        where: vi.fn(),
      };
      for (const key of Object.keys(qb)) {
        if (key !== 'getRawMany') {
          qb[key]?.mockReturnValue(qb);
        }
      }
      const service = await buildService({
        create: vi.fn(),
        createQueryBuilder: vi.fn().mockReturnValue(qb),
        save: vi.fn(),
      });

      return { qb, service };
    };

    it('sums per (account, provider) and keeps a null account as the unattributed bucket', async () => {
      const { qb, service } = await buildRangeService(
        vi.fn().mockResolvedValue([
          {
            agentAccountId: 'account-1',
            cachedReadTokens: '10',
            cachedWriteTokens: '0',
            costUsd: '1.5',
            inputTokens: '100',
            outputTokens: '20',
            provider: 'claude',
            reasoningTokens: '0',
            totalTokens: '120',
            turnCount: '3',
          },
          {
            agentAccountId: null,
            cachedReadTokens: null,
            cachedWriteTokens: null,
            costUsd: null,
            inputTokens: '5',
            outputTokens: '5',
            provider: 'grok',
            reasoningTokens: null,
            totalTokens: '10',
            turnCount: '1',
          },
        ]),
      );

      await expect(service.getUsageByAccountInRange(range)).resolves.toEqual([
        {
          agentAccountId: 'account-1',
          cachedReadTokens: 10,
          cachedWriteTokens: 0,
          costUsd: 1.5,
          inputTokens: 100,
          outputTokens: 20,
          provider: 'claude',
          reasoningTokens: 0,
          totalTokens: 120,
          turnCount: 3,
        },
        {
          agentAccountId: null,
          cachedReadTokens: 0,
          cachedWriteTokens: 0,
          costUsd: 0,
          inputTokens: 5,
          outputTokens: 5,
          provider: 'grok',
          reasoningTokens: 0,
          totalTokens: 10,
          turnCount: 1,
        },
      ]);
      expect(qb.groupBy).toHaveBeenCalledWith('u.agent_account_id');
      expect(qb.addGroupBy).toHaveBeenCalledWith('u.provider');
    });

    describe('when narrowed to one account', () => {
      it('filters on that account id', async () => {
        const { qb, service } = await buildRangeService(
          vi.fn().mockResolvedValue([]),
        );

        await service.getUsageByAccountInRange({
          ...range,
          account: { id: 'account-1', kind: 'account' },
        });

        expect(qb.andWhere).toHaveBeenCalledWith(
          'u.agent_account_id = :agentAccountId',
          { agentAccountId: 'account-1' },
        );
      });
    });

    describe('when narrowed to unattributed rows', () => {
      it('filters on a null account', async () => {
        const { qb, service } = await buildRangeService(
          vi.fn().mockResolvedValue([]),
        );

        await service.getUsageByAccountInRange({
          ...range,
          account: { kind: 'unattributed' },
        });

        expect(qb.andWhere).toHaveBeenCalledWith('u.agent_account_id IS NULL');
      });
    });
  });
});
