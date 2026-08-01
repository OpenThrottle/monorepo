import {
  AgentTokenUsageService,
  RolesService,
  agentTokenUsageFactory,
  type TokenUsageTotals,
} from '@openthrottle/nestjs-repositories';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { createMock } from '@golevelup/ts-vitest';
import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { TokenUsageResolver } from './token-usage.resolver';

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
            getUsageTotalsInRange,
            listUsageInRange,
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
      totalTokens: 1540,
    });
    expect(result.totals).toMatchObject({
      cacheReadTokens: 900,
      cacheWriteTokens: 300,
      costUsd: 0.09,
      turnCount: 2,
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
});
