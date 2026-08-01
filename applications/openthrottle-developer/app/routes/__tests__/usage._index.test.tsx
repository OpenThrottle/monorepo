import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { loader } from '../usage._index';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('@openthrottle/react-router-graphql');

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const dailyStatsResponse = {
  dailyStatsRange: {
    items: [
      {
        date: '2026-01-01',
        plansCompleted: 1,
        plansCreated: 0,
        plansUpdated: 0,
        tasksCompleted: 2,
        tasksCreated: 0,
        tasksUpdated: 0,
      },
    ],
  },
};

const tokenUsageResponse = {
  tokenUsage: {
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
    pattern: '/usage',
    request,
    url: new URL(request.url),
  });
};

describe('routes/usage._index.tsx', () => {
  describe('loader', () => {
    beforeEach(() => {
      // Two calls per load: daily stats first, token usage second.
      mockExecuteGraphqlWithAuth
        .mockReset()
        .mockResolvedValueOnce(dailyStatsResponse)
        .mockResolvedValueOnce(tokenUsageResponse);
    });

    test('returns daily stats + token usage for a 30-day window (all providers)', async () => {
      const result = await runLoader('http://localhost/usage');

      expect(result.dailyStats).toEqual(
        dailyStatsResponse.dailyStatsRange.items,
      );
      expect(result.rangeDays).toBe(30);
      expect(result.selectedProvider).toBeNull();
      expect(result.tokenUsageItems).toEqual(
        tokenUsageResponse.tokenUsage.items,
      );
      expect(result.tokenUsageTotals).toEqual(
        tokenUsageResponse.tokenUsage.totals,
      );

      // Token usage is queried on YYYY-MM-DD with no provider filter.
      expect(mockExecuteGraphqlWithAuth).toHaveBeenNthCalledWith(
        2,
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({
          end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          provider: null,
          start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );
    });

    test('forwards ?provider= to the token usage query', async () => {
      const result = await runLoader(
        'http://localhost/usage?provider=opencode',
      );

      expect(result.selectedProvider).toBe('opencode');
      expect(mockExecuteGraphqlWithAuth).toHaveBeenNthCalledWith(
        2,
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({ provider: 'opencode' }),
      );
    });
  });
});
