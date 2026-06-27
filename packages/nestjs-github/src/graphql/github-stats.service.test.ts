import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { GitHubService } from '../github/github.service';
import { GitHubStatsService } from './github-stats.service';

describe('GitHubStatsService', () => {
  let githubService: GitHubService;
  let githubStatsService: GitHubStatsService;

  beforeAll(async () => {
    const mockGitHubService = createMock<GitHubService>({
      getPullCommitCount: vi.fn(),
      getPullDetail: vi.fn(),
      getPullReviews: vi.fn(),
      listAllPulls: vi.fn(),
      listIssues: vi.fn(),
    });

    const module = await Test.createTestingModule({
      providers: [
        GitHubStatsService,
        {
          provide: GitHubService,
          useValue: mockGitHubService,
        },
      ],
    }).compile();

    githubStatsService = module.get(GitHubStatsService);
    githubService = module.get(GitHubService);
  });

  describe('getOpenPrCountByAuthor', () => {
    test('returns aggregated open PR counts by author sorted by count descending', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: null,
          number: 1,
          state: 'open',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: null,
          number: 2,
          state: 'open',
          title: '',
          updatedAt: '',
        },
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: null,
          number: 3,
          state: 'open',
          title: '',
          updatedAt: '',
        },
      ]);

      const result = await githubStatsService.getOpenPrCountByAuthor(
        'owner',
        'repo',
      );

      expect(githubService.listAllPulls).toHaveBeenCalledWith('owner', 'repo', {
        state: 'open',
      });
      expect(result).toEqual([
        { author: 'alice', openCount: 2 },
        { author: 'bob', openCount: 1 },
      ]);
    });

    test('returns empty array when repo has no open PRs', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([]);

      const result = await githubStatsService.getOpenPrCountByAuthor('o', 'r');

      expect(result).toEqual([]);
    });

    test('uses (unknown) for PRs with empty author', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: '',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: null,
          number: 1,
          state: 'open',
          title: '',
          updatedAt: '',
        },
      ]);

      const result = await githubStatsService.getOpenPrCountByAuthor(
        'owner',
        'repo',
      );

      expect(result).toEqual([{ author: '(unknown)', openCount: 1 }]);
    });
  });

  describe('getPrTimeInStateSummary', () => {
    test('returns open, closed, and merged summaries with counts and avg days', async () => {
      vi.mocked(githubService.listAllPulls)
        .mockResolvedValueOnce([
          {
            author: 'alice',
            baseRef: null,
            createdAt: '2026-01-01T00:00:00Z',
            headRef: null,
            headSha: null,
            htmlUrl: '',
            mergedAt: null,
            number: 1,
            state: 'open',
            title: '',
            updatedAt: '2026-01-02T00:00:00Z',
          },
        ])
        .mockResolvedValueOnce([
          {
            author: 'bob',
            baseRef: null,
            createdAt: '2026-01-01T00:00:00Z',
            headRef: null,
            headSha: null,
            htmlUrl: '',
            mergedAt: '2026-01-11T00:00:00Z',
            number: 2,
            state: 'closed',
            title: '',
            updatedAt: '2026-01-11T00:00:00Z',
          },
          {
            author: 'bob',
            baseRef: null,
            createdAt: '2026-01-05T00:00:00Z',
            headRef: null,
            headSha: null,
            htmlUrl: '',
            mergedAt: null,
            number: 3,
            state: 'closed',
            title: '',
            updatedAt: '2026-01-08T00:00:00Z',
          },
        ]);

      const result = await githubStatsService.getPrTimeInStateSummary(
        'owner',
        'repo',
      );

      expect(githubService.listAllPulls).toHaveBeenCalledWith('owner', 'repo', {
        state: 'open',
      });
      expect(githubService.listAllPulls).toHaveBeenCalledWith('owner', 'repo', {
        state: 'closed',
      });
      expect(result).toHaveLength(3);

      const openSummary = result.find((r) => r.state === 'open');
      expect(openSummary?.count).toBe(1);
      expect(openSummary?.avgDaysInState).toBeGreaterThanOrEqual(0);

      const closedSummary = result.find((r) => r.state === 'closed');
      expect(closedSummary?.count).toBe(1);
      expect(closedSummary?.avgDaysInState).toBe(3); // 2026-01-05 to 2026-01-08

      const mergedSummary = result.find((r) => r.state === 'merged');
      expect(mergedSummary?.count).toBe(1);
      expect(mergedSummary?.avgDaysInState).toBe(10); // 2026-01-01 to 2026-01-11
    });

    test('returns null avgDaysInState when no PRs in a state', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([]);

      const result = await githubStatsService.getPrTimeInStateSummary('o', 'r');

      expect(result).toEqual([
        { avgDaysInState: null, count: 0, state: 'open' },
        { avgDaysInState: null, count: 0, state: 'closed' },
        { avgDaysInState: null, count: 0, state: 'merged' },
      ]);
    });
  });

  describe('getLinesAddedDeletedByPeriodOrAuthor', () => {
    beforeEach(() => {
      vi.mocked(githubService.getPullDetail).mockClear();
      vi.mocked(githubService.listAllPulls).mockClear();
    });

    test('aggregates additions/deletions by period and author from merged PR details', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-02-01T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-02-01T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullDetail)
        .mockResolvedValueOnce({
          additions: 100,
          author: 'alice',
          changedFiles: 5,
          deletions: 20,
          mergedAt: '2026-02-01T00:00:00Z',
          number: 1,
        })
        .mockResolvedValueOnce({
          additions: 50,
          author: 'bob',
          changedFiles: 2,
          deletions: 10,
          mergedAt: '2026-02-01T00:00:00Z',
          number: 2,
        });

      const result =
        await githubStatsService.getLinesAddedDeletedByPeriodOrAuthor(
          'owner',
          'repo',
          { period: 'month' },
        );

      expect(githubService.listAllPulls).toHaveBeenCalledWith('owner', 'repo', {
        merged: true,
        state: 'closed',
      });
      expect(githubService.getPullDetail).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
      );
      expect(githubService.getPullDetail).toHaveBeenCalledWith(
        'owner',
        'repo',
        2,
      );
      expect(result).toHaveLength(2);
      const aliceRow = result.find((r) => r.author === 'alice');
      const bobRow = result.find((r) => r.author === 'bob');
      expect(aliceRow?.additions).toBe(100);
      expect(aliceRow?.deletions).toBe(20);
      expect(aliceRow?.prCount).toBe(1);
      expect(aliceRow?.period).toBe('2026-02');
      expect(bobRow?.additions).toBe(50);
      expect(bobRow?.deletions).toBe(10);
      expect(bobRow?.prCount).toBe(1);
    });

    test('respects maxPrs and only fetches that many PR details', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-01T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-01T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullDetail)
        .mockResolvedValueOnce({
          additions: 1,
          author: 'alice',
          changedFiles: 1,
          deletions: 0,
          mergedAt: '2026-01-01T00:00:00Z',
          number: 1,
        })
        .mockResolvedValueOnce({
          additions: 2,
          author: 'bob',
          changedFiles: 1,
          deletions: 0,
          mergedAt: '2026-01-01T00:00:00Z',
          number: 2,
        });

      await githubStatsService.getLinesAddedDeletedByPeriodOrAuthor('o', 'r', {
        maxPrs: 2,
      });

      expect(githubService.getPullDetail).toHaveBeenCalledTimes(2);
    });

    test('returns empty array when no merged PRs', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([]);
      vi.mocked(githubService.getPullDetail).mockClear();

      const result =
        await githubStatsService.getLinesAddedDeletedByPeriodOrAuthor(
          'owner',
          'repo',
        );

      expect(githubService.getPullDetail).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getOpenToMergedCycleTime', () => {
    beforeEach(() => {
      vi.mocked(githubService.listAllPulls).mockClear();
    });

    test('returns repo-wide median and P90 when period is omitted', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-02T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-11T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-06T00:00:00Z',
          number: 3,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);

      const result = await githubStatsService.getOpenToMergedCycleTime(
        'owner',
        'repo',
      );

      expect(githubService.listAllPulls).toHaveBeenCalledWith('owner', 'repo', {
        merged: true,
        state: 'closed',
      });
      expect(result).toHaveLength(1);
      const row = result[0];
      expect(row?.period).toBeNull();
      expect(row?.prCount).toBe(3);
      // 1 day, 5 days, 10 days -> median = 5, P90 = interpolated ~9
      expect(row?.medianDays).toBe(5);
      expect(row?.p90Days).toBe(9);
    });

    test('returns one row per period bucket when period is month', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-11T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '2026-02-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-02-03T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);

      const result = await githubStatsService.getOpenToMergedCycleTime(
        'owner',
        'repo',
        {
          period: 'month',
        },
      );

      expect(result).toHaveLength(2);
      const jan = result.find((r) => r.period === '2026-01');
      const feb = result.find((r) => r.period === '2026-02');
      expect(jan?.prCount).toBe(1);
      expect(jan?.medianDays).toBe(10);
      expect(jan?.p90Days).toBe(10);
      expect(feb?.prCount).toBe(1);
      expect(feb?.medianDays).toBe(2);
      expect(feb?.p90Days).toBe(2);
    });

    test('returns null median and P90 when no merged PRs', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([]);

      const result = await githubStatsService.getOpenToMergedCycleTime(
        'owner',
        'repo',
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.medianDays).toBeNull();
      expect(result[0]?.p90Days).toBeNull();
      expect(result[0]?.period).toBeNull();
      expect(result[0]?.prCount).toBe(0);
    });

    test('ignores closed-but-not-merged PRs', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: null,
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);

      const result = await githubStatsService.getOpenToMergedCycleTime(
        'owner',
        'repo',
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.prCount).toBe(0);
      expect(result[0]?.medianDays).toBeNull();
      expect(result[0]?.p90Days).toBeNull();
    });
  });

  describe('getPrCountByLabel', () => {
    beforeEach(() => {
      vi.mocked(githubService.listIssues).mockClear();
    });

    test('returns PR counts per label sorted by count descending', async () => {
      vi.mocked(githubService.listIssues).mockResolvedValue([
        { labels: ['bug', 'priority:high'], number: 1, state: 'open' },
        { labels: ['feature'], number: 2, state: 'open' },
        { labels: ['bug'], number: 3, state: 'closed' },
      ]);

      const result = await githubStatsService.getPrCountByLabel(
        'owner',
        'repo',
      );

      expect(githubService.listIssues).toHaveBeenCalledWith('owner', 'repo', {
        state: 'all',
      });
      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ count: 2, label: 'bug' });
      expect(result).toContainEqual({ count: 1, label: 'feature' });
      expect(result).toContainEqual({ count: 1, label: 'priority:high' });
      expect(result.map((r) => r.count)).toEqual([2, 1, 1]);
    });

    test('passes state filter to listIssues', async () => {
      vi.mocked(githubService.listIssues).mockResolvedValue([
        { labels: ['feature'], number: 1, state: 'open' },
      ]);

      await githubStatsService.getPrCountByLabel('owner', 'repo', {
        state: 'open',
      });

      expect(githubService.listIssues).toHaveBeenCalledWith('owner', 'repo', {
        state: 'open',
      });
    });

    test('counts PRs with no labels under (no label)', async () => {
      vi.mocked(githubService.listIssues).mockResolvedValue([
        { labels: [], number: 1, state: 'open' },
        { labels: [], number: 2, state: 'closed' },
      ]);

      const result = await githubStatsService.getPrCountByLabel(
        'owner',
        'repo',
      );

      expect(result).toEqual([{ count: 2, label: '(no label)' }]);
    });

    test('returns empty array when repo has no PRs', async () => {
      vi.mocked(githubService.listIssues).mockResolvedValue([]);

      const result = await githubStatsService.getPrCountByLabel(
        'owner',
        'repo',
      );

      expect(result).toEqual([]);
    });
  });

  describe('getPrsMergedPerPeriod', () => {
    beforeEach(() => {
      vi.mocked(githubService.listAllPulls).mockClear();
    });

    test('returns PR counts per month sorted by period descending', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-15T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-20T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'alice',
          baseRef: null,
          createdAt: '2026-02-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-02-10T00:00:00Z',
          number: 3,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);

      const result = await githubStatsService.getPrsMergedPerPeriod(
        'owner',
        'repo',
        { period: 'month' },
      );

      expect(githubService.listAllPulls).toHaveBeenCalledWith('owner', 'repo', {
        merged: true,
        state: 'closed',
      });
      expect(result).toHaveLength(2);
      const feb = result.find((r) => r.period === '2026-02');
      const jan = result.find((r) => r.period === '2026-01');
      expect(feb?.count).toBe(1);
      expect(jan?.count).toBe(2);
      expect(result[0]?.period).toBe('2026-02');
      expect(result[1]?.period).toBe('2026-01');
    });

    test('returns PR counts per week when period is week', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-05T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-12T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);

      const result = await githubStatsService.getPrsMergedPerPeriod(
        'owner',
        'repo',
        { period: 'week' },
      );

      expect(githubService.listAllPulls).toHaveBeenCalledWith('owner', 'repo', {
        merged: true,
        state: 'closed',
      });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.count).sort()).toEqual([1, 1]);
    });

    test('labels weeks with ISO-8601 week numbers (Thursday-anchored, year-boundary aware)', async () => {
      // 2021-01-01 is a Friday → ISO week 2020-W53 (not 2021-W01).
      // 2026-01-01 is a Thursday → ISO week 2026-W01.
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2021-01-01T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-01T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);

      const result = await githubStatsService.getPrsMergedPerPeriod(
        'owner',
        'repo',
        { period: 'week' },
      );

      const periods = result.map((r) => r.period);
      expect(periods).toContain('2020-W53');
      expect(periods).toContain('2026-W01');
    });

    test('maps known dates to their exact ISO-8601 week buckets', async () => {
      // Each merged date is in its own week, so the result has one row per date
      // and we can assert the precise YYYY-Www label produced by toPeriodBucket:
      //  - 2026-01-01 (Thu) → 2026-W01 (week 1 contains the year's first Thursday).
      //  - 2026-01-05 (Mon, start of W02) and 2026-01-11 (Sun, end of W02) both → 2026-W02.
      //  - 2021-01-01 (Fri) → 2020-W53 (week-year differs from calendar year).
      //  - 2027-01-01 (Fri) → 2026-W53 (forward year-boundary case).
      const dates = [
        '2026-01-01T12:00:00Z',
        '2026-01-05T00:00:00Z',
        '2026-01-11T23:59:59Z',
        '2021-01-01T00:00:00Z',
        '2027-01-01T00:00:00Z',
      ];
      vi.mocked(githubService.listAllPulls).mockResolvedValue(
        dates.map((mergedAt, i) => ({
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt,
          number: i + 1,
          state: 'closed' as const,
          title: '',
          updatedAt: '',
        })),
      );

      const result = await githubStatsService.getPrsMergedPerPeriod(
        'owner',
        'repo',
        { period: 'week' },
      );

      const byPeriod = new Map(result.map((r) => [r.period, r.count]));
      expect(byPeriod.get('2026-W01')).toBe(1);
      // The Monday-start and Sunday-end of W02 collapse into one bucket.
      expect(byPeriod.get('2026-W02')).toBe(2);
      expect(byPeriod.get('2020-W53')).toBe(1);
      expect(byPeriod.get('2026-W53')).toBe(1);
      // Every week label is zero-padded to two digits (YYYY-Www).
      for (const period of byPeriod.keys()) {
        expect(period).toMatch(/^\d{4}-W\d{2}$/);
      }
    });

    test('returns empty array when no merged PRs', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([]);

      const result = await githubStatsService.getPrsMergedPerPeriod(
        'owner',
        'repo',
        { period: 'month' },
      );

      expect(result).toEqual([]);
    });

    test('ignores PRs with null mergedAt', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: null,
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);

      const result = await githubStatsService.getPrsMergedPerPeriod(
        'owner',
        'repo',
        { period: 'month' },
      );

      expect(result).toEqual([]);
    });
  });

  describe('getReviewCycleTime', () => {
    beforeEach(() => {
      vi.mocked(githubService.getPullReviews).mockClear();
      vi.mocked(githubService.listAllPulls).mockClear();
    });

    test('returns repo-wide median and P90 from last CHANGES_REQUESTED to first APPROVED', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-05T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-12T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullReviews)
        .mockResolvedValueOnce([
          { state: 'CHANGES_REQUESTED', submittedAt: '2026-01-02T00:00:00Z' },
          { state: 'APPROVED', submittedAt: '2026-01-03T00:00:00Z' },
        ])
        .mockResolvedValueOnce([
          { state: 'CHANGES_REQUESTED', submittedAt: '2026-01-03T00:00:00Z' },
          { state: 'APPROVED', submittedAt: '2026-01-10T00:00:00Z' },
        ]);

      const result = await githubStatsService.getReviewCycleTime(
        'owner',
        'repo',
      );

      expect(githubService.listAllPulls).toHaveBeenCalledWith('owner', 'repo', {
        merged: true,
        state: 'closed',
      });
      expect(githubService.getPullReviews).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
      );
      expect(githubService.getPullReviews).toHaveBeenCalledWith(
        'owner',
        'repo',
        2,
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.period).toBeNull();
      expect(result[0]?.prCount).toBe(2);
      // PR1: 2026-01-02 -> 2026-01-03 = 1 day; PR2: 2026-01-03 -> 2026-01-10 = 7 days; median=4, P90 interpolated
      expect(result[0]?.medianDays).toBe(4);
      expect(result[0]?.p90Days).toBeCloseTo(6.4, 1);
    });

    test('uses merged_at as end when no APPROVED after last CHANGES_REQUESTED', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-06T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullReviews).mockResolvedValue([
        { state: 'CHANGES_REQUESTED', submittedAt: '2026-01-02T00:00:00Z' },
        { state: 'COMMENT', submittedAt: '2026-01-03T00:00:00Z' },
      ]);

      const result = await githubStatsService.getReviewCycleTime(
        'owner',
        'repo',
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.prCount).toBe(1);
      // 2026-01-02 to 2026-01-06 = 4 days
      expect(result[0]?.medianDays).toBe(4);
      expect(result[0]?.p90Days).toBe(4);
    });

    test('excludes PRs with no CHANGES_REQUESTED', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '2026-01-01T00:00:00Z',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-05T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullReviews).mockResolvedValue([
        { state: 'APPROVED', submittedAt: '2026-01-02T00:00:00Z' },
      ]);

      const result = await githubStatsService.getReviewCycleTime(
        'owner',
        'repo',
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.prCount).toBe(0);
      expect(result[0]?.medianDays).toBeNull();
      expect(result[0]?.p90Days).toBeNull();
    });

    test('returns one row per period bucket when period is month', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-15T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-02-10T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullReviews)
        .mockResolvedValueOnce([
          { state: 'CHANGES_REQUESTED', submittedAt: '2026-01-10T00:00:00Z' },
          { state: 'APPROVED', submittedAt: '2026-01-12T00:00:00Z' },
        ])
        .mockResolvedValueOnce([
          { state: 'CHANGES_REQUESTED', submittedAt: '2026-02-05T00:00:00Z' },
          { state: 'APPROVED', submittedAt: '2026-02-08T00:00:00Z' },
        ]);

      const result = await githubStatsService.getReviewCycleTime(
        'owner',
        'repo',
        {
          period: 'month',
        },
      );

      expect(result).toHaveLength(2);
      const jan = result.find((r) => r.period === '2026-01');
      const feb = result.find((r) => r.period === '2026-02');
      expect(jan?.prCount).toBe(1);
      expect(jan?.medianDays).toBe(2);
      expect(jan?.p90Days).toBe(2);
      expect(feb?.prCount).toBe(1);
      expect(feb?.medianDays).toBe(3);
      expect(feb?.p90Days).toBe(3);
    });

    test('returns single row with prCount 0 and null median/P90 when no merged PRs', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([]);

      const result = await githubStatsService.getReviewCycleTime(
        'owner',
        'repo',
      );

      expect(githubService.getPullReviews).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]?.prCount).toBe(0);
      expect(result[0]?.medianDays).toBeNull();
      expect(result[0]?.p90Days).toBeNull();
      expect(result[0]?.period).toBeNull();
    });

    test('respects maxPrs and only fetches reviews for that many PRs', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-05T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-10T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullReviews).mockResolvedValueOnce([
        { state: 'CHANGES_REQUESTED', submittedAt: '2026-01-02T00:00:00Z' },
        { state: 'APPROVED', submittedAt: '2026-01-03T00:00:00Z' },
      ]);

      await githubStatsService.getReviewCycleTime('owner', 'repo', {
        maxPrs: 1,
      });

      expect(githubService.getPullReviews).toHaveBeenCalledTimes(1);
      expect(githubService.getPullReviews).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
      );
    });

    test('uses last CHANGES_REQUESTED when multiple rounds', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-10T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullReviews).mockResolvedValue([
        { state: 'CHANGES_REQUESTED', submittedAt: '2026-01-02T00:00:00Z' },
        { state: 'APPROVED', submittedAt: '2026-01-03T00:00:00Z' },
        { state: 'CHANGES_REQUESTED', submittedAt: '2026-01-05T00:00:00Z' },
        { state: 'APPROVED', submittedAt: '2026-01-07T00:00:00Z' },
      ]);

      const result = await githubStatsService.getReviewCycleTime(
        'owner',
        'repo',
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.prCount).toBe(1);
      // Last CHANGES_REQUESTED 2026-01-05 -> first APPROVED after 2026-01-07 = 2 days
      expect(result[0]?.medianDays).toBe(2);
      expect(result[0]?.p90Days).toBe(2);
    });
  });

  describe('getCommitsPerPr', () => {
    beforeEach(() => {
      vi.mocked(githubService.getPullCommitCount).mockClear();
      vi.mocked(githubService.listAllPulls).mockClear();
    });

    test('returns one row per merged PR with commits, mergedAt, and optional period', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-02-01T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-02-15T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullCommitCount)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(7);

      const result = await githubStatsService.getCommitsPerPr('owner', 'repo', {
        period: 'month',
      });

      expect(githubService.listAllPulls).toHaveBeenCalledWith('owner', 'repo', {
        merged: true,
        state: 'closed',
      });
      expect(githubService.getPullCommitCount).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
      );
      expect(githubService.getPullCommitCount).toHaveBeenCalledWith(
        'owner',
        'repo',
        2,
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        commits: 7,
        mergedAt: '2026-02-15T00:00:00Z',
        period: '2026-02',
        prNumber: 2,
      });
      expect(result[1]).toEqual({
        commits: 3,
        mergedAt: '2026-02-01T00:00:00Z',
        period: '2026-02',
        prNumber: 1,
      });
    });

    test('returns period null when period option is omitted', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-02-01T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullCommitCount).mockResolvedValue(5);

      const result = await githubStatsService.getCommitsPerPr('owner', 'repo');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        commits: 5,
        mergedAt: '2026-02-01T00:00:00Z',
        period: null,
        prNumber: 1,
      });
    });

    test('respects maxPrs and only fetches commit count for that many PRs', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([
        {
          author: 'alice',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-01T00:00:00Z',
          number: 1,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
        {
          author: 'bob',
          baseRef: null,
          createdAt: '',
          headRef: null,
          headSha: null,
          htmlUrl: '',
          mergedAt: '2026-01-02T00:00:00Z',
          number: 2,
          state: 'closed',
          title: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(githubService.getPullCommitCount).mockResolvedValue(1);

      await githubStatsService.getCommitsPerPr('owner', 'repo', { maxPrs: 1 });

      expect(githubService.getPullCommitCount).toHaveBeenCalledTimes(1);
      expect(githubService.getPullCommitCount).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
      );
    });

    test('returns empty array when no merged PRs', async () => {
      vi.mocked(githubService.listAllPulls).mockResolvedValue([]);

      const result = await githubStatsService.getCommitsPerPr('owner', 'repo');

      expect(githubService.getPullCommitCount).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
