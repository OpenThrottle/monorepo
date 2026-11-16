import { createMock } from '@golevelup/ts-vitest';
import type { GitHubService } from '@openthrottle/nestjs-github';
import { describe, expect, it, vi } from 'vitest';

import { GitHubForgeService } from './github-forge.service.ts';

const pullDetail = {
  additions: 1,
  author: 'octocat',
  changedFiles: 1,
  deletions: 0,
  mergeCommitSha: 'squash',
  mergedAt: '2026-11-01T00:00:00Z',
  number: 7,
  state: 'closed',
};

const pullListItem = (
  number: number,
): Awaited<ReturnType<GitHubService['listPulls']>>[number] => {
  return {
    author: 'octocat',
    baseRef: 'main',
    createdAt: '2026-11-01T00:00:00Z',
    headRef: 'feat/x',
    headSha: null,
    htmlUrl: `https://github.com/acme/monorepo/pull/${number}`,
    mergedAt: null,
    number,
    state: 'open',
    title: 'feat: x',
    updatedAt: '2026-11-01T00:00:00Z',
  };
};

describe('GitHubForgeService', () => {
  it('splits fullName into owner and repo for GitHubService', async () => {
    const githubService = createMock<GitHubService>();
    vi.mocked(githubService.getDefaultBranch).mockResolvedValue('main');
    const forge = new GitHubForgeService(githubService);

    await expect(forge.getDefaultBranch('acme/monorepo')).resolves.toBe('main');
    expect(githubService.getDefaultBranch).toHaveBeenCalledWith(
      'acme',
      'monorepo',
    );
  });

  it('builds GitHub web URLs', () => {
    const forge = new GitHubForgeService(createMock<GitHubService>());

    expect(forge.pullRequestUrl('acme/monorepo', 7)).toBe(
      'https://github.com/acme/monorepo/pull/7',
    );
    expect(forge.commitUrl('acme/monorepo', 'abc')).toBe(
      'https://github.com/acme/monorepo/commit/abc',
    );
  });

  it('maps a pull detail to the forge-neutral shape', async () => {
    const githubService = createMock<GitHubService>();
    vi.mocked(githubService.getPullDetail).mockResolvedValue(pullDetail);
    const forge = new GitHubForgeService(githubService);

    await expect(forge.getPullRequest('acme/monorepo', 7)).resolves.toEqual({
      mergeCommitSha: 'squash',
      mergedAt: '2026-11-01T00:00:00Z',
      number: 7,
      state: 'closed',
    });
  });

  describe('findPullRequestForBranch', () => {
    it('looks the branch up in any state and returns the newest request', async () => {
      const githubService = createMock<GitHubService>();
      vi.mocked(githubService.listPulls).mockResolvedValue([
        pullListItem(7),
        pullListItem(3),
      ]);
      vi.mocked(githubService.getPullDetail).mockResolvedValue(pullDetail);
      const forge = new GitHubForgeService(githubService);

      const pull = await forge.findPullRequestForBranch(
        'acme/monorepo',
        'feat/x',
      );

      expect(githubService.listPulls).toHaveBeenCalledWith('acme', 'monorepo', {
        head: 'feat/x',
        state: 'all',
      });
      expect(githubService.getPullDetail).toHaveBeenCalledWith(
        'acme',
        'monorepo',
        7,
      );
      expect(pull?.number).toBe(7);
    });

    it('returns null when no request has that head', async () => {
      const githubService = createMock<GitHubService>();
      vi.mocked(githubService.listPulls).mockResolvedValue([]);
      const forge = new GitHubForgeService(githubService);

      await expect(
        forge.findPullRequestForBranch('acme/monorepo', 'feat/x'),
      ).resolves.toBeNull();
    });
  });

  it('refuses a nested path, which can never be a GitHub repo', async () => {
    const forge = new GitHubForgeService(createMock<GitHubService>());

    await expect(forge.getDefaultBranch('a/b/c')).rejects.toThrow(
      /Not a GitHub owner\/repo/,
    );
  });
});
