import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { loader } from '../usage.agents';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const tokenUsageResponse = {
  tokenUsage: {
    byAccount: [],
    items: [
      {
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        costUsd: 0.05,
        createdAt: '2026-01-01T00:00:00.000Z',
        id: 'usage-1',
        inputTokens: 1000,
        model: 'claude-opus-4-8',
        outputTokens: 300,
        provider: 'claude',
        reasoningTokens: 0,
        totalTokens: 1300,
      },
    ],
    totals: {
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 0.05,
      inputTokens: 1000,
      outputTokens: 300,
      reasoningTokens: 0,
      totalTokens: 1300,
      turnCount: 1,
    },
  },
};

const runLoader = (url: string) => {
  const request = new Request(url);

  return loader({
    context: createTestRouterContext(),
    params: {},
    pattern: '/usage/agents',
    request,
    url: new URL(request.url),
  });
};

describe('routes/usage.agents.tsx', () => {
  describe('loader', () => {
    beforeEach(() => {
      mockExecuteGraphqlWithAuth
        .mockReset()
        .mockResolvedValueOnce(tokenUsageResponse);
    });

    test('returns token usage for a 30-day window with no filters', async () => {
      const result = await runLoader('http://localhost/usage/agents');

      expect(result.rangeDays).toBe(30);
      expect(result.selectedProvider).toBeNull();
      expect(result.selectedAccount).toBeNull();
      expect(result.tokenUsageItems).toEqual(
        tokenUsageResponse.tokenUsage.items,
      );
      expect(result.tokenUsageTotals).toEqual(
        tokenUsageResponse.tokenUsage.totals,
      );
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledTimes(1);
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({
          accountId: null,
          end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          provider: null,
          start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );
    });

    test('forwards ?provider= and ?account= to the token usage query', async () => {
      const result = await runLoader(
        'http://localhost/usage/agents?provider=opencode&account=acct-1',
      );

      expect(result.selectedProvider).toBe('opencode');
      expect(result.selectedAccount).toBe('acct-1');
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({ accountId: 'acct-1', provider: 'opencode' }),
      );
    });
  });
});
