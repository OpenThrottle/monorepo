import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { loader } from '../usage.skills';

vi.mock('@openthrottle/react-router-graphql');

// The loader walks the checkout for skills on disk; under a busy test pool that
// walk outran the 15s timeout. Stub it like the /skills loader test does.
vi.mock('~/routing/agents/utils/discoverRepoSkills.server', () => ({
  discoverRepoSkills: vi.fn(),
}));

vi.mock('~/routing/agents/utils/resolve-monorepo-root.server', () => ({
  getMonorepoRoot: vi.fn(),
}));

const { discoverRepoSkills } =
  await import('~/routing/agents/utils/discoverRepoSkills.server');
const { getMonorepoRoot } =
  await import('~/routing/agents/utils/resolve-monorepo-root.server');

const mockDiscoverRepoSkills = vi.mocked(discoverRepoSkills);
const mockGetMonorepoRoot = vi.mocked(getMonorepoRoot);
const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const skillUsageResponse = {
  skillUsage: {
    byDay: [
      {
        date: '2026-01-01',
        injectedCount: 0,
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
        sessionEndedCount: 0,
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
    pattern: '/usage/skills',
    request,
    url: new URL(request.url),
  });
};

describe('routes/usage.skills.tsx', () => {
  describe('loader', () => {
    beforeEach(() => {
      mockGetMonorepoRoot.mockReset().mockReturnValue('/repo');
      mockDiscoverRepoSkills.mockReset().mockReturnValue([]);
      // Two parallel calls: skill usage, then the first page of the branch
      // dropdown.
      mockExecuteGraphqlWithAuth
        .mockReset()
        .mockResolvedValueOnce(skillUsageResponse)
        .mockResolvedValueOnce(branchSearchResponse);
    });

    test('returns skill usage and a seeded branch dropdown for 30 days', async () => {
      const result = await runLoader('http://localhost/usage/skills');

      expect(result.rangeDays).toBe(30);
      expect(result.selectedSkillScope).toBeNull();
      expect(result.selectedSkillGitBranch).toBeNull();
      expect(result.selectedSkillCwd).toBeNull();
      expect(result.selectedSkillRepo).toBeNull();
      expect(result.skillUsage).toEqual(skillUsageResponse.skillUsage);
      // The dropdown is seeded server-side rather than from filterOptions.
      expect(result.branchOptions).toEqual(
        branchSearchResponse.skillUsageGitBranches.items,
      );
      expect(result.branchesHaveMore).toBe(true);
      // Disk-discovered slugs the leaderboard may link through to /skills/$slug.
      expect(result.presentSkillSlugs).toEqual([]);
      expect(mockDiscoverRepoSkills).toHaveBeenCalledWith('/repo');
      expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledTimes(2);

      expect(mockExecuteGraphqlWithAuth).toHaveBeenNthCalledWith(
        1,
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
        2,
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

    test('forwards skillScope/skillBranch/skillCwd/skillRepo to the skill usage query', async () => {
      const result = await runLoader(
        'http://localhost/usage/skills?skillScope=ours&skillBranch=main&skillCwd=%2Frepo&skillRepo=github.com%2Fo%2Fr',
      );

      expect(result.selectedSkillScope).toBe('ours');
      expect(result.selectedSkillGitBranch).toBe('main');
      expect(result.selectedSkillCwd).toBe('/repo');
      expect(result.selectedSkillRepo).toBe('github.com/o/r');
      expect(mockExecuteGraphqlWithAuth).toHaveBeenNthCalledWith(
        1,
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({
          cwd: '/repo',
          gitBranch: 'main',
          repoIdentity: 'github.com/o/r',
          scope: 'ours',
        }),
      );
    });
  });
});
