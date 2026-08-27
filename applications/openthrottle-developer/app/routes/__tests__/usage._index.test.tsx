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

const skillUsageResponse = {
  skillUsage: {
    byDay: [
      {
        date: '2026-01-01',
        oursCount: 1,
        thirdPartyCount: 0,
        totalCount: 1,
      },
    ],
    byScope: [{ count: 1, scope: 'ours' }],
    bySkill: [
      {
        abandonedCount: 0,
        avgDurationMs: null,
        count: 1,
        errorCount: 0,
        outcomeCount: 0,
        scope: 'ours',
        skillName: 'ot-plans',
        successCount: 0,
      },
    ],
    filterOptions: { cwds: [], gitBranches: [] },
    totalCount: 1,
  },
};

const branchSearchResponse = {
  skillUsageGitBranches: {
    hasMore: true,
    items: [
      { branch: 'main', count: 12 },
      { branch: 'alpha', count: 3 },
    ],
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
      // Four parallel calls: daily stats, token usage, skill usage, and the
      // first page of the branch dropdown.
      mockExecuteGraphqlWithAuth
        .mockReset()
        .mockResolvedValueOnce(dailyStatsResponse)
        .mockResolvedValueOnce(tokenUsageResponse)
        .mockResolvedValueOnce(skillUsageResponse)
        .mockResolvedValueOnce(branchSearchResponse);
    });

    test('returns daily stats + token usage + skill usage for a 30-day window', async () => {
      const result = await runLoader('http://localhost/usage');

      expect(result.dailyStats).toEqual(
        dailyStatsResponse.dailyStatsRange.items,
      );
      expect(result.rangeDays).toBe(30);
      expect(result.selectedProvider).toBeNull();
      expect(result.selectedSkillScope).toBeNull();
      expect(result.selectedSkillGitBranch).toBeNull();
      expect(result.selectedSkillCwd).toBeNull();
      expect(result.tokenUsageItems).toEqual(
        tokenUsageResponse.tokenUsage.items,
      );
      expect(result.tokenUsageTotals).toEqual(
        tokenUsageResponse.tokenUsage.totals,
      );
      expect(result.skillUsage).toEqual(skillUsageResponse.skillUsage);
      // The dropdown is seeded server-side rather than from filterOptions.
      expect(result.branchOptions).toEqual(
        branchSearchResponse.skillUsageGitBranches.items,
      );
      expect(result.branchesHaveMore).toBe(true);
      // Disk-discovered slugs the leaderboard may link through to /skills/$slug.
      expect(Array.isArray(result.presentSkillSlugs)).toBe(true);

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

      // Skill usage is queried on YYYY-MM-DD with no scope/branch/cwd filter.
      expect(mockExecuteGraphqlWithAuth).toHaveBeenNthCalledWith(
        3,
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({
          cwd: null,
          end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          gitBranch: null,
          scope: null,
          start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );

      // The branch dropdown asks for the unfiltered first page.
      expect(mockExecuteGraphqlWithAuth).toHaveBeenNthCalledWith(
        4,
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({
          end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          limit: null,
          query: null,
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

    test('forwards skillScope/skillBranch/skillCwd to the skill usage query', async () => {
      const result = await runLoader(
        'http://localhost/usage?skillScope=ours&skillBranch=main&skillCwd=%2Frepo',
      );

      expect(result.selectedSkillScope).toBe('ours');
      expect(result.selectedSkillGitBranch).toBe('main');
      expect(result.selectedSkillCwd).toBe('/repo');
      expect(mockExecuteGraphqlWithAuth).toHaveBeenNthCalledWith(
        3,
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({
          cwd: '/repo',
          gitBranch: 'main',
          scope: 'ours',
        }),
      );
    });
  });
});
