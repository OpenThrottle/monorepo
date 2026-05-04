import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, beforeAll, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { PullListItemDto } from '../github/dto/pull-list-item.dto';
import { GitHubService } from '../github/github.service';
import { GithubResolver } from './github.resolver';
import { GitHubStatsService } from './github-stats.service';

describe('GithubResolver', () => {
  let resolver: GithubResolver;
  let githubService: GitHubService;
  let githubStatsService: GitHubStatsService;

  const mockPullDto: PullListItemDto = {
    author: 'visormatt',
    createdAt: '2026-02-01T12:00:00Z',
    htmlUrl: 'https://github.com/owner/repo/pull/1',
    mergedAt: null,
    number: 1,
    state: 'open',
    title: 'Test PR',
    updatedAt: '2026-02-01T12:00:00Z',
  };

  beforeAll(async () => {
    const mockGitHubService = createMock<GitHubService>({
      getPullListItem: vi.fn(),
      listPulls: vi.fn(),
    });
    const mockGitHubStatsService = createMock<GitHubStatsService>({
      getCommitsPerPr: vi.fn(),
      getLinesAddedDeletedByPeriodOrAuthor: vi.fn(),
      getOpenPrCountByAuthor: vi.fn(),
      getOpenToMergedCycleTime: vi.fn(),
      getPrCountByLabel: vi.fn(),
      getPrTimeInStateSummary: vi.fn(),
      getPrsMergedPerPeriod: vi.fn(),
      getReviewCycleTime: vi.fn(),
    });

    const app = await Test.createTestingModule({
      providers: [
        GithubResolver,
        {
          provide: GitHubService,
          useValue: mockGitHubService,
        },
        {
          provide: GitHubStatsService,
          useValue: mockGitHubStatsService,
        },
      ],
    }).compile();

    resolver = app.get<GithubResolver>(GithubResolver);
    githubService = app.get<GitHubService>(GitHubService);
    githubStatsService = app.get<GitHubStatsService>(GitHubStatsService);
  });

  describe('pulls', () => {
    test('returns array of PullListItemObject from GitHubService', async () => {
      vi.mocked(githubService.listPulls).mockResolvedValue([mockPullDto]);

      const result = await resolver.pulls({
        base: null,
        merged: null,
        owner: 'owner',
        repo: 'repo',
        state: 'open',
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.author).toBe(mockPullDto.author);
      expect(result[0]?.createdAt).toBe(mockPullDto.createdAt);
      expect(result[0]?.htmlUrl).toBe(mockPullDto.htmlUrl);
      expect(result[0]?.mergedAt).toBe(mockPullDto.mergedAt);
      expect(result[0]?.number).toBe(mockPullDto.number);
      expect(result[0]?.state).toBe(mockPullDto.state);
      expect(result[0]?.title).toBe(mockPullDto.title);
      expect(result[0]?.updatedAt).toBe(mockPullDto.updatedAt);

      expect(githubService.listPulls).toHaveBeenCalledWith('owner', 'repo', {
        base: undefined,
        merged: undefined,
        state: 'open',
      });
    });

    test('passes optional state, base, merged to GitHubService', async () => {
      vi.mocked(githubService.listPulls).mockResolvedValue([]);

      await resolver.pulls({
        base: 'main',
        merged: true,
        owner: 'o',
        repo: 'r',
        state: 'all',
      });

      expect(githubService.listPulls).toHaveBeenCalledWith('o', 'r', {
        base: 'main',
        merged: true,
        state: 'all',
      });
    });

    test('returns empty array when no pulls', async () => {
      vi.mocked(githubService.listPulls).mockResolvedValue([]);

      const result = await resolver.pulls({
        base: null,
        merged: null,
        owner: 'owner',
        repo: 'repo',
        state: null,
      });

      expect(result).toEqual([]);
      expect(githubService.listPulls).toHaveBeenCalledWith('owner', 'repo', {
        base: undefined,
        merged: undefined,
        state: 'open',
      });
    });
  });

  describe('pull', () => {
    test('returns PullListItemObject from GitHubService', async () => {
      vi.mocked(githubService.getPullListItem).mockResolvedValue(mockPullDto);

      const result = await resolver.pull({
        number: 1,
        owner: 'owner',
        repo: 'repo',
      });

      expect(result).toEqual(mockPullDto);
      expect(githubService.getPullListItem).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
      );
    });

    test('returns null when GitHubService returns null', async () => {
      vi.mocked(githubService.getPullListItem).mockResolvedValue(null);

      const result = await resolver.pull({
        number: 404,
        owner: 'owner',
        repo: 'repo',
      });

      expect(result).toBeNull();
    });
  });

  describe('openPrCountByAuthor', () => {
    test('returns open PR count by author from GitHubStatsService', async () => {
      vi.mocked(githubStatsService.getOpenPrCountByAuthor).mockResolvedValue([
        { author: 'alice', openCount: 3 },
        { author: 'bob', openCount: 1 },
      ]);

      const result = await resolver.openPrCountByAuthor({
        owner: 'owner',
        repo: 'repo',
      });

      expect(githubStatsService.getOpenPrCountByAuthor).toHaveBeenCalledWith(
        'owner',
        'repo',
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ author: 'alice', openCount: 3 });
      expect(result[1]).toEqual({ author: 'bob', openCount: 1 });
    });

    test('returns empty array when service returns no authors', async () => {
      vi.mocked(githubStatsService.getOpenPrCountByAuthor).mockResolvedValue(
        [],
      );

      const result = await resolver.openPrCountByAuthor({
        owner: 'o',
        repo: 'r',
      });

      expect(result).toEqual([]);
    });
  });

  describe('prTimeInStateSummary', () => {
    test('returns time-in-state summary from GitHubStatsService', async () => {
      vi.mocked(githubStatsService.getPrTimeInStateSummary).mockResolvedValue([
        { avgDaysInState: 2.5, count: 5, state: 'open' },
        { avgDaysInState: 4.0, count: 10, state: 'merged' },
      ]);

      const result = await resolver.prTimeInStateSummary({
        owner: 'owner',
        repo: 'repo',
      });

      expect(githubStatsService.getPrTimeInStateSummary).toHaveBeenCalledWith(
        'owner',
        'repo',
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        avgDaysInState: 2.5,
        count: 5,
        state: 'open',
      });
      expect(result[1]).toEqual({
        avgDaysInState: 4.0,
        count: 10,
        state: 'merged',
      });
    });

    test('returns empty array when service returns no summary', async () => {
      vi.mocked(githubStatsService.getPrTimeInStateSummary).mockResolvedValue(
        [],
      );

      const result = await resolver.prTimeInStateSummary({
        owner: 'o',
        repo: 'r',
      });

      expect(result).toEqual([]);
    });
  });

  describe('linesAddedDeleted', () => {
    test('returns lines added/deleted rows from GitHubStatsService', async () => {
      vi.mocked(
        githubStatsService.getLinesAddedDeletedByPeriodOrAuthor,
      ).mockResolvedValue([
        {
          additions: 200,
          author: 'alice',
          changedFiles: 8,
          deletions: 30,
          period: '2026-02',
          prCount: 2,
        },
      ]);

      const result = await resolver.linesAddedDeleted({
        maxPrs: null,
        owner: 'owner',
        period: 'month',
        repo: 'repo',
      });

      expect(
        githubStatsService.getLinesAddedDeletedByPeriodOrAuthor,
      ).toHaveBeenCalledWith('owner', 'repo', {
        maxPrs: undefined,
        period: 'month',
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        additions: 200,
        author: 'alice',
        changedFiles: 8,
        deletions: 30,
        period: '2026-02',
        prCount: 2,
      });
    });

    test('passes maxPrs and period to service', async () => {
      vi.mocked(
        githubStatsService.getLinesAddedDeletedByPeriodOrAuthor,
      ).mockResolvedValue([]);

      await resolver.linesAddedDeleted({
        maxPrs: 50,
        owner: 'o',
        period: 'week',
        repo: 'r',
      });

      expect(
        githubStatsService.getLinesAddedDeletedByPeriodOrAuthor,
      ).toHaveBeenCalledWith('o', 'r', {
        maxPrs: 50,
        period: 'week',
      });
    });

    test('defaults period to month when null', async () => {
      vi.mocked(
        githubStatsService.getLinesAddedDeletedByPeriodOrAuthor,
      ).mockResolvedValue([]);

      await resolver.linesAddedDeleted({
        maxPrs: null,
        owner: 'o',
        period: null,
        repo: 'r',
      });

      expect(
        githubStatsService.getLinesAddedDeletedByPeriodOrAuthor,
      ).toHaveBeenCalledWith('o', 'r', {
        maxPrs: undefined,
        period: 'month',
      });
    });
  });

  describe('openToMergedCycleTime', () => {
    test('returns cycle time rows from GitHubStatsService', async () => {
      vi.mocked(githubStatsService.getOpenToMergedCycleTime).mockResolvedValue([
        {
          medianDays: 5,
          p90Days: 10,
          period: null,
          prCount: 12,
        },
      ]);

      const result = await resolver.openToMergedCycleTime({
        owner: 'owner',
        period: null,
        repo: 'repo',
      });

      expect(githubStatsService.getOpenToMergedCycleTime).toHaveBeenCalledWith(
        'owner',
        'repo',
        { period: undefined },
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        medianDays: 5,
        p90Days: 10,
        period: null,
        prCount: 12,
      });
    });

    test('passes period to service when provided', async () => {
      vi.mocked(githubStatsService.getOpenToMergedCycleTime).mockResolvedValue([
        { medianDays: 3, p90Days: 7, period: '2026-02', prCount: 4 },
      ]);

      await resolver.openToMergedCycleTime({
        owner: 'o',
        period: 'month',
        repo: 'r',
      });

      expect(githubStatsService.getOpenToMergedCycleTime).toHaveBeenCalledWith(
        'o',
        'r',
        { period: 'month' },
      );
    });
  });

  describe('prCountByLabel', () => {
    test('returns PR counts by label from GitHubStatsService', async () => {
      vi.mocked(githubStatsService.getPrCountByLabel).mockResolvedValue([
        { count: 5, label: 'bug' },
        { count: 3, label: 'feature' },
      ]);

      const result = await resolver.prCountByLabel({
        owner: 'owner',
        repo: 'repo',
        state: null,
      });

      expect(githubStatsService.getPrCountByLabel).toHaveBeenCalledWith(
        'owner',
        'repo',
        { state: 'all' },
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ count: 5, label: 'bug' });
      expect(result[1]).toEqual({ count: 3, label: 'feature' });
    });

    test('passes state to service when provided', async () => {
      vi.mocked(githubStatsService.getPrCountByLabel).mockResolvedValue([]);

      await resolver.prCountByLabel({
        owner: 'o',
        repo: 'r',
        state: 'open',
      });

      expect(githubStatsService.getPrCountByLabel).toHaveBeenCalledWith(
        'o',
        'r',
        { state: 'open' },
      );
    });
  });

  describe('prsMergedPerPeriod', () => {
    test('returns PRs merged per period from GitHubStatsService', async () => {
      vi.mocked(githubStatsService.getPrsMergedPerPeriod).mockResolvedValue([
        { count: 5, period: '2026-02' },
        { count: 3, period: '2026-01' },
      ]);

      const result = await resolver.prsMergedPerPeriod({
        owner: 'owner',
        period: 'month',
        repo: 'repo',
      });

      expect(githubStatsService.getPrsMergedPerPeriod).toHaveBeenCalledWith(
        'owner',
        'repo',
        { period: 'month' },
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ count: 5, period: '2026-02' });
      expect(result[1]).toEqual({ count: 3, period: '2026-01' });
    });

    test('passes period week to service', async () => {
      vi.mocked(githubStatsService.getPrsMergedPerPeriod).mockResolvedValue([
        { count: 2, period: '2026-W06' },
      ]);

      await resolver.prsMergedPerPeriod({
        owner: 'o',
        period: 'week',
        repo: 'r',
      });

      expect(githubStatsService.getPrsMergedPerPeriod).toHaveBeenCalledWith(
        'o',
        'r',
        { period: 'week' },
      );
    });
  });

  describe('reviewCycleTime', () => {
    test('returns review cycle time from GitHubStatsService', async () => {
      vi.mocked(githubStatsService.getReviewCycleTime).mockResolvedValue([
        {
          medianDays: 2,
          p90Days: 5,
          period: null,
          prCount: 10,
        },
      ]);

      const result = await resolver.reviewCycleTime({
        maxPrs: null,
        owner: 'owner',
        period: null,
        repo: 'repo',
      });

      expect(githubStatsService.getReviewCycleTime).toHaveBeenCalledWith(
        'owner',
        'repo',
        { maxPrs: undefined, period: undefined },
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        medianDays: 2,
        p90Days: 5,
        period: null,
        prCount: 10,
      });
    });

    test('passes maxPrs and period to service', async () => {
      vi.mocked(githubStatsService.getReviewCycleTime).mockResolvedValue([
        { medianDays: 1, p90Days: 2, period: '2026-02', prCount: 3 },
      ]);

      await resolver.reviewCycleTime({
        maxPrs: 50,
        owner: 'o',
        period: 'month',
        repo: 'r',
      });

      expect(githubStatsService.getReviewCycleTime).toHaveBeenCalledWith(
        'o',
        'r',
        { maxPrs: 50, period: 'month' },
      );
    });
  });

  describe('commitsPerPr', () => {
    test('returns commits-per-PR rows from GitHubStatsService', async () => {
      vi.mocked(githubStatsService.getCommitsPerPr).mockResolvedValue([
        {
          commits: 5,
          mergedAt: '2026-02-01T00:00:00Z',
          period: '2026-02',
          prNumber: 1,
        },
      ]);

      const result = await resolver.commitsPerPr({
        maxPrs: null,
        owner: 'owner',
        period: 'month',
        repo: 'repo',
      });

      expect(githubStatsService.getCommitsPerPr).toHaveBeenCalledWith(
        'owner',
        'repo',
        { maxPrs: undefined, period: 'month' },
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        commits: 5,
        mergedAt: '2026-02-01T00:00:00Z',
        period: '2026-02',
        prNumber: 1,
      });
    });

    test('passes maxPrs and period to service', async () => {
      vi.mocked(githubStatsService.getCommitsPerPr).mockResolvedValue([]);

      await resolver.commitsPerPr({
        maxPrs: 50,
        owner: 'o',
        period: 'week',
        repo: 'r',
      });

      expect(githubStatsService.getCommitsPerPr).toHaveBeenCalledWith(
        'o',
        'r',
        { maxPrs: 50, period: 'week' },
      );
    });
  });
});
