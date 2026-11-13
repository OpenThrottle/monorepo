import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  AgentAccountsService,
  AgentTokenUsageService,
  RolesService,
  type TokenUsageTotals,
} from '@openthrottle/nestjs-repositories';
import {
  agentAccountFactory,
  agentTokenUsageFactory,
} from '@openthrottle/nestjs-repositories/testing';
import { beforeAll, beforeEach, describe, expect, it, test, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { AgentAccountStampingService } from '../../services/agent-account-stamping/agent-account-stamping.service.ts';
import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID } from './token-usage.constants.ts';
import type { RecordTokenUsageRowInput } from './token-usage.input.ts';
import { TokenUsageResolver } from './token-usage.resolver.ts';

describe('TokenUsageResolver', () => {
  let resolver: TokenUsageResolver;

  const humanPrincipal: AuthPrincipal = {
    kind: AUTH_PRINCIPAL_KIND_USER,
    sub: 'user-1',
  };
  const serviceAccountPrincipal: AuthPrincipal = {
    kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
    sub: 'sa-1',
  };

  const listUsageInRange = vi.fn();
  const getUsageTotalsInRange = vi.fn();
  const getUsageByAccountInRange = vi.fn().mockResolvedValue([]);
  const listByIds = vi.fn().mockResolvedValue([]);
  const recordTokenUsageBatch = vi.fn();
  const resolveEffectiveUserId = vi.fn();
  const stampIdentity = vi.fn();

  const totals: TokenUsageTotals = {
    cachedReadTokens: 900,
    cachedWriteTokens: 300,
    costUsd: 0.09,
    inputTokens: 1500,
    outputTokens: 375,
    reasoningTokens: 34,
    totalTokens: 1875,
    turnCount: 2,
  };

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        TokenUsageResolver,
        {
          provide: AgentTokenUsageService,
          useValue: createMock<AgentTokenUsageService>({
            getUsageByAccountInRange,
            getUsageTotalsInRange,
            listUsageInRange,
            recordTokenUsageBatch,
          }),
        },
        {
          provide: AgentAccountsService,
          useValue: createMock<AgentAccountsService>({ listByIds }),
        },
        {
          provide: AgentAccountStampingService,
          useValue: createMock<AgentAccountStampingService>({ stampIdentity }),
        },
        {
          provide: EffectiveUserResolutionService,
          useValue: createMock<EffectiveUserResolutionService>({
            resolveEffectiveUserId,
          }),
        },
        { provide: RolesService, useValue: createMock<RolesService>() },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get(TokenUsageResolver);
  });

  test('rejects a non-human (service-account) principal', async () => {
    await expect(
      resolver.tokenUsage(serviceAccountPrincipal, '2026-07-01', '2026-07-31'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  test('scopes to the caller and forwards the full range (all providers)', async () => {
    const rows = [
      agentTokenUsageFactory.build({
        cachedReadTokens: 900,
        cachedWriteTokens: 300,
        costUsd: 0.06,
        id: 'usage-1',
        inputTokens: 1200,
        model: 'claude-opus-4-8',
        outputTokens: 340,
        provider: 'claude',
        reasoningTokens: 34,
        source: 'claude-code',
        totalTokens: 1540,
      }),
    ];
    listUsageInRange.mockResolvedValueOnce(rows);
    getUsageTotalsInRange.mockResolvedValueOnce(totals);

    const result = await resolver.tokenUsage(
      humanPrincipal,
      '2026-07-01',
      '2026-07-31',
    );

    const expectedQuery = {
      end: '2026-07-31',
      provider: undefined,
      start: '2026-07-01',
      userId: 'user-1',
    };
    expect(listUsageInRange).toHaveBeenCalledWith(expectedQuery);
    expect(getUsageTotalsInRange).toHaveBeenCalledWith(expectedQuery);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      cacheReadTokens: 900,
      cacheWriteTokens: 300,
      id: 'usage-1',
      inputTokens: 1200,
      model: 'claude-opus-4-8',
      outputTokens: 340,
      provider: 'claude',
      reasoningTokens: 34,
      source: 'claude-code',
      totalTokens: 1540,
    });
    expect(result.totals).toMatchObject({
      cacheReadTokens: 900,
      cacheWriteTokens: 300,
      costUsd: 0.09,
      turnCount: 2,
    });
  });

  describe('per-account breakdown', () => {
    const bucket = {
      cachedReadTokens: 0,
      cachedWriteTokens: 0,
      costUsd: 1.25,
      inputTokens: 100,
      outputTokens: 20,
      reasoningTokens: 0,
      totalTokens: 120,
      turnCount: 3,
    };

    test('resolves each bucket to its account, keeping the unattributed bucket', async () => {
      const account = agentAccountFactory.build({
        email: 'dev@example.com',
        id: 'account-1',
        orgName: 'Example',
        plan: 'team',
        provider: 'claude',
      });
      listUsageInRange.mockResolvedValueOnce([]);
      getUsageTotalsInRange.mockResolvedValueOnce(totals);
      getUsageByAccountInRange.mockResolvedValueOnce([
        { ...bucket, agentAccountId: 'account-1', provider: 'claude' },
        { ...bucket, agentAccountId: null, provider: 'grok' },
      ]);
      listByIds.mockResolvedValueOnce([account]);

      const result = await resolver.tokenUsage(
        humanPrincipal,
        '2026-07-01',
        '2026-07-31',
      );

      expect(listByIds).toHaveBeenCalledWith('user-1', ['account-1']);
      expect(result.byAccount).toHaveLength(2);
      expect(result.byAccount[0]).toMatchObject({
        account: {
          email: 'dev@example.com',
          id: 'account-1',
          orgName: 'Example',
          plan: 'team',
        },
        provider: 'claude',
        totals: { costUsd: 1.25, turnCount: 3 },
      });
      expect(result.byAccount[1]).toMatchObject({
        account: null,
        provider: 'grok',
      });
    });

    test('narrows to one account', async () => {
      listUsageInRange.mockResolvedValueOnce([]);
      getUsageTotalsInRange.mockResolvedValueOnce(totals);

      await resolver.tokenUsage(
        humanPrincipal,
        '2026-07-01',
        '2026-07-31',
        null,
        'account-1',
      );

      expect(listUsageInRange).toHaveBeenCalledWith(
        expect.objectContaining({
          account: { id: 'account-1', kind: 'account' },
        }),
      );
    });

    test('narrows to unattributed rows with the sentinel id', async () => {
      listUsageInRange.mockResolvedValueOnce([]);
      getUsageTotalsInRange.mockResolvedValueOnce(totals);

      await resolver.tokenUsage(
        humanPrincipal,
        '2026-07-01',
        '2026-07-31',
        null,
        TOKEN_USAGE_UNATTRIBUTED_ACCOUNT_ID,
      );

      expect(getUsageByAccountInRange).toHaveBeenCalledWith(
        expect.objectContaining({ account: { kind: 'unattributed' } }),
      );
    });
  });

  test('narrows to a single provider when supplied', async () => {
    listUsageInRange.mockResolvedValueOnce([]);
    getUsageTotalsInRange.mockResolvedValueOnce({
      ...totals,
      turnCount: 0,
    });

    await resolver.tokenUsage(
      humanPrincipal,
      '2026-07-01',
      '2026-07-31',
      'opencode',
    );

    const expectedQuery = {
      end: '2026-07-31',
      provider: 'opencode',
      start: '2026-07-01',
      userId: 'user-1',
    };
    expect(listUsageInRange).toHaveBeenCalledWith(expectedQuery);
    expect(getUsageTotalsInRange).toHaveBeenCalledWith(expectedQuery);
  });
  describe('recordTokenUsage', () => {
    const buildRow = (
      overrides: Partial<RecordTokenUsageRowInput> = {},
    ): RecordTokenUsageRowInput => {
      return {
        account: null,
        cacheReadTokens: 900,
        cacheWriteTokens: 300,
        costUsd: null,
        cwd: '/work/repo',
        gitBranch: 'main',
        inputTokens: 1200,
        model: 'claude-opus-4-8',
        occurredAt: '2026-10-01T08:30:00.000Z',
        outputTokens: 340,
        provider: 'claude',
        rawUsageJson: '{"service_tier":"standard"}',
        reasoningTokens: null,
        requestId: 'req-1',
        sessionId: 'sess-1',
        source: 'claude-code',
        totalTokens: 2740,
        ...overrides,
      };
    };

    beforeEach(() => {
      recordTokenUsageBatch.mockReset();
      resolveEffectiveUserId.mockReset();
      stampIdentity.mockReset();
    });

    describe('when rows carry the agent account', () => {
      const account = {
        credentialKind: 'subscription',
        email: 'Dev@Example.com',
        externalAccountId: 'org-1:dev@example.com',
        orgId: 'org-1',
        orgName: 'Example',
        plan: 'team',
      };

      beforeEach(() => {
        resolveEffectiveUserId.mockResolvedValueOnce('user-1');
        recordTokenUsageBatch.mockResolvedValueOnce({
          inserted: 2,
          skipped: 0,
        });
      });

      it('upserts each distinct account once and stamps its id on its rows', async () => {
        stampIdentity.mockResolvedValueOnce('account-1');

        await resolver.recordTokenUsage(
          {
            rows: [
              buildRow({ account, requestId: 'req-1' }),
              buildRow({ account, requestId: 'req-2' }),
              buildRow({ requestId: 'req-3' }),
            ],
          },
          'user-1',
        );

        expect(stampIdentity).toHaveBeenCalledOnce();
        expect(stampIdentity).toHaveBeenCalledWith('user-1', {
          credentialKind: 'subscription',
          email: 'dev@example.com',
          externalAccountId: 'org-1:dev@example.com',
          kind: 'identified',
          orgId: 'org-1',
          orgName: 'Example',
          plan: 'team',
          provider: 'claude',
        });
        expect(
          recordTokenUsageBatch.mock.calls[0]?.[1].map(
            (row: { agentAccountId: string | null }) => row.agentAccountId,
          ),
        ).toEqual(['account-1', 'account-1', null]);
      });

      it('stores an unrecognised credential kind as unknown', async () => {
        stampIdentity.mockResolvedValueOnce('account-1');

        await resolver.recordTokenUsage(
          {
            rows: [
              buildRow({ account: { ...account, credentialKind: 'oauth' } }),
            ],
          },
          'user-1',
        );

        expect(stampIdentity).toHaveBeenCalledWith(
          'user-1',
          expect.objectContaining({ credentialKind: 'unknown' }),
        );
      });

      it('leaves the row unattributed, without rejecting, when the account id is blank', async () => {
        await resolver.recordTokenUsage(
          {
            rows: [
              buildRow({ account: { ...account, externalAccountId: ' ' } }),
            ],
          },
          'user-1',
        );

        expect(stampIdentity).not.toHaveBeenCalled();
        expect(recordTokenUsageBatch.mock.calls[0]?.[1][0].agentAccountId).toBe(
          null,
        );
      });

      it('leaves the row unattributed when the upsert yields no id', async () => {
        stampIdentity.mockResolvedValueOnce(null);

        await resolver.recordTokenUsage(
          { rows: [buildRow({ account })] },
          'user-1',
        );

        expect(recordTokenUsageBatch.mock.calls[0]?.[1][0].agentAccountId).toBe(
          null,
        );
      });
    });

    describe('when no user resolves from the principal', () => {
      it('rejects with Forbidden and writes nothing', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce(null);

        await expect(
          resolver.recordTokenUsage({ rows: [buildRow()] }, 'sa-unlinked'),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(recordTokenUsageBatch).not.toHaveBeenCalled();
      });

      it('rejects before validating the batch, so a bad credential is not a poisoned row', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce(null);

        await expect(
          resolver.recordTokenUsage(
            { rows: [buildRow({ model: ' ' })] },
            undefined,
          ),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });
    });

    describe('when a human user is the principal', () => {
      it('attributes the batch to the resolved user and maps rows', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce('user-1');
        recordTokenUsageBatch.mockResolvedValueOnce({
          inserted: 1,
          skipped: 0,
        });

        const result = await resolver.recordTokenUsage(
          { rows: [buildRow()] },
          'user-1',
        );

        expect(resolveEffectiveUserId).toHaveBeenCalledWith('user-1');
        expect(recordTokenUsageBatch).toHaveBeenCalledWith('user-1', [
          {
            agentAccountId: null,
            cachedReadTokens: 900,
            cachedWriteTokens: 300,
            costUsd: null,
            cwd: '/work/repo',
            gitBranch: 'main',
            inputTokens: 1200,
            model: 'claude-opus-4-8',
            occurredAt: new Date('2026-10-01T08:30:00.000Z'),
            outputTokens: 340,
            provider: 'claude',
            rawUsage: { service_tier: 'standard' },
            reasoningTokens: null,
            repoIdentity: null,
            requestId: 'req-1',
            sessionId: 'sess-1',
            source: 'claude-code',
            totalTokens: 2740,
          },
        ]);
        expect(result).toMatchObject({ inserted: 1, skipped: 0 });
      });
    });

    describe('when a service account acts as a user', () => {
      it('uses the acting user id, never the service-account sub', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce('acting-user');
        recordTokenUsageBatch.mockResolvedValueOnce({
          inserted: 1,
          skipped: 0,
        });

        await resolver.recordTokenUsage({ rows: [buildRow()] }, 'sa-1');

        expect(resolveEffectiveUserId).toHaveBeenCalledWith('sa-1');
        expect(recordTokenUsageBatch).toHaveBeenCalledWith(
          'acting-user',
          expect.any(Array),
        );
      });
    });

    describe('when the same batch is re-sent', () => {
      it('reports every row skipped and zero inserted', async () => {
        resolveEffectiveUserId.mockResolvedValue('user-1');
        recordTokenUsageBatch
          .mockResolvedValueOnce({ inserted: 2, skipped: 0 })
          .mockResolvedValueOnce({ inserted: 0, skipped: 2 });
        const input = {
          rows: [buildRow(), buildRow({ requestId: 'req-2' })],
        };

        const first = await resolver.recordTokenUsage(input, 'user-1');
        const second = await resolver.recordTokenUsage(input, 'user-1');

        expect(first).toMatchObject({ inserted: 2, skipped: 0 });
        expect(second).toMatchObject({ inserted: 0, skipped: 2 });
      });
    });

    describe('when part of a batch was already recorded', () => {
      it('passes the whole batch through and reports the split', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce('user-1');
        recordTokenUsageBatch.mockResolvedValueOnce({
          inserted: 1,
          skipped: 2,
        });

        const result = await resolver.recordTokenUsage(
          {
            rows: [
              buildRow({ requestId: 'req-1' }),
              buildRow({ requestId: 'req-2' }),
              buildRow({ requestId: 'req-3' }),
            ],
          },
          'user-1',
        );

        expect(recordTokenUsageBatch.mock.calls[0]?.[1]).toHaveLength(3);
        expect(result).toMatchObject({ inserted: 1, skipped: 2 });
      });
    });

    describe('created_at', () => {
      it('is carried as occurredAt (event time), not ingest time', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce('user-1');
        recordTokenUsageBatch.mockResolvedValueOnce({
          inserted: 1,
          skipped: 0,
        });
        const occurredAt = '2025-01-02T03:04:05.000Z';

        await resolver.recordTokenUsage(
          { rows: [buildRow({ occurredAt })] },
          'user-1',
        );

        expect(recordTokenUsageBatch.mock.calls[0]?.[1]).toEqual([
          expect.objectContaining({ occurredAt: new Date(occurredAt) }),
        ]);
      });
    });

    describe('row validation', () => {
      const rejectedCases: ReadonlyArray<
        readonly [string, Partial<RecordTokenUsageRowInput>, string]
      > = [
        ['a blank provider', { provider: '  ' }, 'rows[1].provider'],
        ['a blank model', { model: '' }, 'rows[1].model'],
        ['a blank source', { source: ' ' }, 'rows[1].source'],
        ['a negative token count', { inputTokens: -1 }, 'rows[1].inputTokens'],
        [
          'a fractional token count',
          { outputTokens: 1.5 },
          'rows[1].outputTokens',
        ],
        [
          'a non-finite token count',
          { totalTokens: Number.POSITIVE_INFINITY },
          'rows[1].totalTokens',
        ],
        ['a negative cost', { costUsd: -0.01 }, 'rows[1].costUsd'],
        ['an invalid date', { occurredAt: 'nope' }, 'rows[1].occurredAt'],
        [
          'unparseable rawUsageJson',
          { rawUsageJson: '{oops' },
          'rows[1].rawUsageJson',
        ],
        [
          'non-object rawUsageJson',
          { rawUsageJson: '[1,2]' },
          'rows[1].rawUsageJson',
        ],
      ];

      test.each(rejectedCases)(
        'rejects the whole batch for %s, naming the row index',
        async (_label, overrides, expectedMessage) => {
          resolveEffectiveUserId.mockResolvedValueOnce('user-1');

          const call = resolver.recordTokenUsage(
            { rows: [buildRow(), buildRow(overrides)] },
            'user-1',
          );

          await expect(call).rejects.toBeInstanceOf(BadRequestException);
          await expect(call).rejects.toThrow(expectedMessage);
          expect(recordTokenUsageBatch).not.toHaveBeenCalled();
        },
      );

      it('accepts null token counts, cost and rawUsageJson', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce('user-1');
        recordTokenUsageBatch.mockResolvedValueOnce({
          inserted: 1,
          skipped: 0,
        });

        await resolver.recordTokenUsage(
          {
            rows: [
              buildRow({
                cacheReadTokens: null,
                cacheWriteTokens: null,
                inputTokens: null,
                outputTokens: null,
                rawUsageJson: null,
                totalTokens: null,
              }),
            ],
          },
          'user-1',
        );

        expect(recordTokenUsageBatch).toHaveBeenCalledOnce();
      });

      it('trims string identity fields and nulls blank ids', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce('user-1');
        recordTokenUsageBatch.mockResolvedValueOnce({
          inserted: 1,
          skipped: 0,
        });

        await resolver.recordTokenUsage(
          {
            rows: [
              buildRow({
                provider: ' claude ',
                requestId: '  ',
                sessionId: ' sess-1 ',
              }),
            ],
          },
          'user-1',
        );

        expect(recordTokenUsageBatch.mock.calls[0]?.[1]).toEqual([
          expect.objectContaining({
            provider: 'claude',
            requestId: null,
            sessionId: 'sess-1',
          }),
        ]);
      });
    });

    describe('repoIdentity', () => {
      it('re-normalizes a remote and nulls a path or an absent value', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce('user-1');
        recordTokenUsageBatch.mockResolvedValueOnce({
          inserted: 3,
          skipped: 0,
        });

        await resolver.recordTokenUsage(
          {
            rows: [
              buildRow({ repoIdentity: 'git@github.com:Org/Repo.git' }),
              buildRow({ repoIdentity: '/Users/someone/repo' }),
              buildRow(),
            ],
          },
          'user-1',
        );

        expect(recordTokenUsageBatch.mock.calls[0]?.[1]).toEqual([
          expect.objectContaining({
            repoIdentity: 'https://github.com/Org/Repo',
          }),
          expect.objectContaining({ repoIdentity: null }),
          expect.objectContaining({ repoIdentity: null }),
        ]);
      });
    });

    describe('batch size', () => {
      it('accepts exactly 500 rows', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce('user-1');
        recordTokenUsageBatch.mockResolvedValueOnce({
          inserted: 500,
          skipped: 0,
        });

        await resolver.recordTokenUsage(
          { rows: Array.from({ length: 500 }, () => buildRow()) },
          'user-1',
        );

        expect(recordTokenUsageBatch).toHaveBeenCalledOnce();
      });

      it('rejects 501 rows with BadRequest', async () => {
        resolveEffectiveUserId.mockResolvedValueOnce('user-1');

        await expect(
          resolver.recordTokenUsage(
            { rows: Array.from({ length: 501 }, () => buildRow()) },
            'user-1',
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(recordTokenUsageBatch).not.toHaveBeenCalled();
      });
    });
  });
});
