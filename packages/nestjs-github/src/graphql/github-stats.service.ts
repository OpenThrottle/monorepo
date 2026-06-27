/**
 * @description Aggregates GitHub PR data for stats: open PR count by author (mirrors queues stats style).
 */

import { Injectable } from '@nestjs/common';
import type { ListPullsOptions } from '../github/github.service';
import { GitHubService } from '../github/github.service';

/**
 * @description Open PR count per author for a repo (mirrors queues stats
 * style: list of { author, openCount }).
 */
interface OpenPrCountByAuthor {
  readonly author: string;
  readonly openCount: number;
}

/**
 * @description PR time-in-state summary: state, count, and average days
 * in that state.
 */
interface PrTimeInStateSummary {
  readonly avgDaysInState: number | null;
  readonly count: number;
  readonly state: string;
}

/** Period bucket: week "YYYY-Www" or month "YYYY-MM" (UTC). */
type LinesAddedDeletedPeriod = 'month' | 'week';

/**
 * @description Options for open-to-merged cycle time aggregation. Optional period buckets results by week or month (UTC).
 */
interface OpenToMergedCycleTimeOptions {
  /** Bucket by week (YYYY-Www) or month (YYYY-MM); omit for a single repo-wide summary. */
  readonly period?: LinesAddedDeletedPeriod;
}

/**
 * @description One row of open-to-merged cycle time: median and P90 days, optionally per period.
 */
interface OpenToMergedCycleTimeRow {
  readonly medianDays: number | null;
  readonly p90Days: number | null;
  readonly period: string | null;
  readonly prCount: number;
}

/**
 * @description PR count per label (breakdown of work by type or priority). A PR with multiple labels is counted under each label.
 */
interface PrCountByLabelRow {
  readonly count: number;
  readonly label: string;
}

/**
 * @description One row of PRs merged per period (throughput trend by week or month).
 */
interface PrsMergedPerPeriodRow {
  readonly count: number;
  readonly period: string;
}

/**
 * @description Options for commits-per-PR aggregation. maxPrs caps API calls; optional period for bucketing.
 */
interface CommitsPerPrOptions {
  /** Max merged PRs to fetch commit count for (default 100). */
  readonly maxPrs?: number;
  /** Bucket by week (YYYY-Www) or month (YYYY-MM); omit for no period column. */
  readonly period?: LinesAddedDeletedPeriod;
}

/**
 * @description One row of commits-per-PR: PR number, commit count, merged_at, optional period bucket.
 */
interface CommitsPerPrRow {
  readonly commits: number;
  readonly mergedAt: string | null;
  readonly period: string | null;
  readonly prNumber: number;
}

/**
 * @description Options for review cycle time aggregation. Optional period buckets by week or month (UTC); maxPrs caps API calls.
 */
interface ReviewCycleTimeOptions {
  /** Max merged PRs to fetch reviews for (default 100). */
  readonly maxPrs?: number;
  /** Bucket by week (YYYY-Www) or month (YYYY-MM); omit for repo-wide summary. */
  readonly period?: LinesAddedDeletedPeriod;
}

/**
 * @description One row of review cycle time: median and P90 days from last CHANGES_REQUESTED to first subsequent APPROVED or merge.
 */
interface ReviewCycleTimeRow {
  readonly medianDays: number | null;
  readonly p90Days: number | null;
  readonly period: string | null;
  readonly prCount: number;
}

/**
 * @description Options for lines added/deleted aggregation. Limits PRs fetched to respect rate limits.
 */
interface LinesAddedDeletedOptions {
  /** Max number of merged PRs to fetch detail for (default 100). */
  readonly maxPrs?: number;
  /** Bucket by week (YYYY-Www) or month (YYYY-MM). */
  readonly period?: LinesAddedDeletedPeriod;
}

/**
 * @description One row of lines-added/deleted aggregation; grouped by period and author.
 */
interface LinesAddedDeletedRow {
  readonly additions: number;
  readonly author: string;
  readonly changedFiles: number;
  readonly deletions: number;
  readonly period: string;
  readonly prCount: number;
}

/**
 * @description Days between two ISO date strings; end defaults to now.
 */
function daysBetween(fromIso: string, toIso?: string): number {
  const from = Date.parse(fromIso);
  const to = toIso !== undefined ? Date.parse(toIso) : Date.now();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, (to - from) / (24 * 60 * 60 * 1000));
}

/**
 * @description Returns the ISO-8601 week-numbering year and week for a date, in
 * UTC. ISO weeks start on Monday and week 1 is the week containing the year's
 * first Thursday, so the week-year can differ from the calendar year near
 * year boundaries (e.g. 2026-01-01 falls in ISO week 2026-W01, but 2027-01-01
 * falls in 2026-W53). Returns `{ year, week }` so the caller can label the
 * bucket with the correct week-numbering year.
 */
function isoWeek(d: Date): { week: number; year: number } {
  // Work on a UTC copy anchored to midnight to avoid DST/time-of-day drift.
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  // ISO weekday: Mon=1 .. Sun=7.
  const isoDay = target.getUTCDay() === 0 ? 7 : target.getUTCDay();
  // Shift to the Thursday of the current ISO week; its calendar year is the
  // ISO week-numbering year.
  target.setUTCDate(target.getUTCDate() + 4 - isoDay);
  const year = target.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 1));
  const firstThursdayIsoDay =
    firstThursday.getUTCDay() === 0 ? 7 : firstThursday.getUTCDay();
  // Move Jan 1 forward to the first Thursday of the week-year.
  firstThursday.setUTCDate(
    firstThursday.getUTCDate() + ((4 - firstThursdayIsoDay + 7) % 7),
  );
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const week =
    Math.round((target.getTime() - firstThursday.getTime()) / msPerWeek) + 1;
  return { week, year };
}

/**
 * @description Returns period bucket string in UTC: week "YYYY-Www" (ISO-8601
 * week-numbering year + week, Thursday-anchored) or month "YYYY-MM".
 */
function toPeriodBucket(
  mergedAtIso: string,
  period: LinesAddedDeletedPeriod,
): string {
  const d = new Date(mergedAtIso);
  if (period === 'month') {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }
  const { week, year } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * @description Returns the p-th percentile (0 <= p <= 1) of a sorted array; null if empty.
 */
function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0] ?? null;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo] ?? null;
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? 0;
  return a + (b - a) * (idx - lo);
}

@Injectable()
export class GitHubStatsService {
  private readonly CACHE_MAX_AGE = 60 * 15; // 15 minutes

  constructor(private readonly githubService: GitHubService) {}

  /**
   * @description Fetches open PRs for the repo and returns counts aggregated by author (login).
   */
  async getOpenPrCountByAuthor(
    owner: string,
    repo: string,
    state: ListPullsOptions['state'] = 'open',
  ): Promise<OpenPrCountByAuthor[]> {
    const pulls = await this.githubService.listAllPulls(owner, repo, { state });

    const byAuthor = new Map<string, number>();
    for (const p of pulls) {
      const author = p.author || '(unknown)';
      byAuthor.set(author, (byAuthor.get(author) ?? 0) + 1);
    }
    return Array.from(byAuthor.entries())
      .map(([author, openCount]) => ({ author, openCount }))
      .sort((a, b) => b.openCount - a.openCount);
  }

  /**
   * @description Returns time-in-state summary for PRs: open (days open so far), closed (not merged), and merged (days from created to merged/updated).
   * Fetches open and closed PRs and aggregates avg days in state per bucket to identify bottlenecks.
   */
  async getPrTimeInStateSummary(
    owner: string,
    repo: string,
  ): Promise<PrTimeInStateSummary[]> {
    const [openPulls, closedPulls] = await Promise.all([
      this.githubService.listAllPulls(owner, repo, { state: 'open' }),
      this.githubService.listAllPulls(owner, repo, { state: 'closed' }),
    ]);

    const nowIso = new Date().toISOString();
    const openDays = openPulls.map((p) => daysBetween(p.createdAt, nowIso));
    const merged = closedPulls.filter((p) => p.mergedAt !== null);
    const closedOnly = closedPulls.filter((p) => p.mergedAt === null);
    const mergedDays = merged.map((p) =>
      daysBetween(p.createdAt, p.mergedAt ?? p.updatedAt),
    );
    const closedDays = closedOnly.map((p) =>
      daysBetween(p.createdAt, p.updatedAt),
    );

    const buildSummary = (
      state: string,
      count: number,
      dayValues: number[],
    ): PrTimeInStateSummary => ({
      avgDaysInState:
        dayValues.length > 0
          ? dayValues.reduce((a, b) => a + b, 0) / dayValues.length
          : null,
      count,
      state,
    });

    return [
      buildSummary('open', openPulls.length, openDays),
      buildSummary('closed', closedOnly.length, closedDays),
      buildSummary('merged', merged.length, mergedDays),
    ];
  }

  /**
   * @description Aggregates lines added/deleted by period (week or month) and author for merged PRs.
   * Lists merged PRs then fetches each for additions/deletions/changed_files; caps at maxPrs to respect rate limits.
   */
  async getLinesAddedDeletedByPeriodOrAuthor(
    owner: string,
    repo: string,
    options: LinesAddedDeletedOptions = {},
  ): Promise<LinesAddedDeletedRow[]> {
    const maxPrs = options.maxPrs ?? 100;
    const periodKind = options.period ?? 'month';

    const mergedPulls = await this.githubService.listAllPulls(owner, repo, {
      merged: true,
      state: 'closed',
    });
    const toFetch = mergedPulls.slice(0, maxPrs);

    const details = await Promise.all(
      toFetch.map((p) =>
        this.githubService.getPullDetail(owner, repo, p.number),
      ),
    );

    const keyToRow = new Map<string, LinesAddedDeletedRow>();
    for (const d of details) {
      const mergedAt = d.mergedAt ?? '';
      const period = mergedAt ? toPeriodBucket(mergedAt, periodKind) : '';
      const author = d.author || '(unknown)';
      const key = `${period}\t${author}`;

      const existing = keyToRow.get(key);
      if (existing) {
        keyToRow.set(key, {
          additions: existing.additions + d.additions,
          author: existing.author,
          changedFiles: existing.changedFiles + d.changedFiles,
          deletions: existing.deletions + d.deletions,
          period: existing.period,
          prCount: existing.prCount + 1,
        });
      } else {
        keyToRow.set(key, {
          additions: d.additions,
          author,
          changedFiles: d.changedFiles,
          deletions: d.deletions,
          period,
          prCount: 1,
        });
      }
    }

    return Array.from(keyToRow.values()).sort(
      (a, b) => b.period.localeCompare(a.period) || b.additions - a.additions,
    );
  }

  /**
   * @description Cycle time for merged PRs: median and P90 of days from created_at to merged_at.
   * Only defined for merged PRs; buckets by period (week/month UTC) when options.period is set.
   */
  async getOpenToMergedCycleTime(
    owner: string,
    repo: string,
    options: OpenToMergedCycleTimeOptions = {},
  ): Promise<OpenToMergedCycleTimeRow[]> {
    const mergedPulls = await this.githubService.listAllPulls(owner, repo, {
      merged: true,
      state: 'closed',
    });

    const periodKind = options.period;
    const withDuration: { days: number; mergedAt: string }[] = [];
    for (const p of mergedPulls) {
      const mergedAt = p.mergedAt;
      if (mergedAt === null) continue;
      const days = daysBetween(p.createdAt, mergedAt);
      withDuration.push({ days, mergedAt });
    }

    if (periodKind === undefined) {
      const sorted = withDuration.map((x) => x.days).sort((a, b) => a - b);
      return [
        {
          medianDays: percentile(sorted, 0.5),
          p90Days: percentile(sorted, 0.9),
          period: null,
          prCount: sorted.length,
        },
      ];
    }

    const byPeriod = new Map<string, number[]>();
    for (const { days, mergedAt } of withDuration) {
      const period = toPeriodBucket(mergedAt, periodKind);
      const arr = byPeriod.get(period) ?? [];
      arr.push(days);
      byPeriod.set(period, arr);
    }

    return Array.from(byPeriod.entries())
      .map(([period, days]) => {
        const sorted = [...days].sort((a, b) => a - b);
        return {
          medianDays: percentile(sorted, 0.5),
          p90Days: percentile(sorted, 0.9),
          period,
          prCount: sorted.length,
        };
      })
      .sort((a, b) => (b.period ?? '').localeCompare(a.period ?? ''));
  }

  /**
   * @description PR counts by label (breakdown by type e.g. bug, feature, docs). Uses Issues API (includes PRs with labels); filters to PRs only. Optional state filter (open/closed/all).
   */
  async getPrCountByLabel(
    owner: string,
    repo: string,
    options: { state?: 'all' | 'closed' | 'open' } = {},
  ): Promise<PrCountByLabelRow[]> {
    const state = options.state ?? 'all';
    const items = await this.githubService.listIssues(owner, repo, { state });

    const byLabel = new Map<string, number>();
    for (const item of items) {
      if (item.labels.length === 0) {
        const key = '(no label)';
        byLabel.set(key, (byLabel.get(key) ?? 0) + 1);
      } else {
        for (const name of item.labels) {
          byLabel.set(name, (byLabel.get(name) ?? 0) + 1);
        }
      }
    }

    return Array.from(byLabel.entries())
      .map(([label, count]) => ({ count, label }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * @description Throughput trend: count of PRs merged per calendar week or month. Uses merged_at only; filters to merged PRs.
   */
  async getPrsMergedPerPeriod(
    owner: string,
    repo: string,
    options: { period: LinesAddedDeletedPeriod },
  ): Promise<PrsMergedPerPeriodRow[]> {
    const mergedPulls = await this.githubService.listAllPulls(owner, repo, {
      merged: true,
      state: 'closed',
    });

    const periodKind = options.period;
    const byPeriod = new Map<string, number>();
    for (const p of mergedPulls) {
      const mergedAt = p.mergedAt;
      if (mergedAt === null) continue;
      const period = toPeriodBucket(mergedAt, periodKind);
      byPeriod.set(period, (byPeriod.get(period) ?? 0) + 1);
    }

    return Array.from(byPeriod.entries())
      .map(([period, count]) => ({ count, period }))
      .sort((a, b) => b.period.localeCompare(a.period));
  }

  /**
   * @description Review cycle time for merged PRs: median and P90 of days from last CHANGES_REQUESTED to first subsequent APPROVED or merged_at.
   * Only PRs with at least one CHANGES_REQUESTED and then an APPROVED or merge are included. Paginates reviews; caps at maxPrs to respect rate limits.
   */
  async getReviewCycleTime(
    owner: string,
    repo: string,
    options: ReviewCycleTimeOptions = {},
  ): Promise<ReviewCycleTimeRow[]> {
    const maxPrs = options.maxPrs ?? 100;
    const periodKind = options.period;

    const mergedPulls = await this.githubService.listAllPulls(owner, repo, {
      merged: true,
      state: 'closed',
    });
    const toFetch = mergedPulls.slice(0, maxPrs);

    const withDuration: { days: number; mergedAt: string }[] = [];
    for (const p of toFetch) {
      const mergedAt = p.mergedAt;
      if (mergedAt === null) continue;

      // Sequential to respect GitHub rate limits (one request per PR).
      // eslint-disable-next-line no-await-in-loop
      const reviews = await this.githubService.getPullReviews(
        owner,
        repo,
        p.number,
      );
      const sorted = [...reviews].sort(
        (a, b) =>
          new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
      );

      let lastChangesRequestedIdx = -1;
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i]?.state === 'CHANGES_REQUESTED') {
          lastChangesRequestedIdx = i;
          break;
        }
      }
      if (lastChangesRequestedIdx === -1) continue;

      const startIso = sorted[lastChangesRequestedIdx]?.submittedAt ?? '';
      const after = sorted.slice(lastChangesRequestedIdx + 1);
      const firstApproval = after.find((r) => r.state === 'APPROVED');
      const endIso =
        firstApproval?.submittedAt !== undefined
          ? firstApproval.submittedAt
          : mergedAt;

      const days = daysBetween(startIso, endIso);
      withDuration.push({ days, mergedAt });
    }

    if (withDuration.length === 0) {
      return [
        {
          medianDays: null,
          p90Days: null,
          period: null,
          prCount: 0,
        },
      ];
    }

    if (periodKind === undefined) {
      const sorted = withDuration.map((x) => x.days).sort((a, b) => a - b);
      return [
        {
          medianDays: percentile(sorted, 0.5),
          p90Days: percentile(sorted, 0.9),
          period: null,
          prCount: sorted.length,
        },
      ];
    }

    const byPeriod = new Map<string, number[]>();
    for (const { days, mergedAt } of withDuration) {
      const period = toPeriodBucket(mergedAt, periodKind);
      const arr = byPeriod.get(period) ?? [];
      arr.push(days);
      byPeriod.set(period, arr);
    }

    return Array.from(byPeriod.entries())
      .map(([period, days]) => {
        const sorted = [...days].sort((a, b) => a - b);
        return {
          medianDays: percentile(sorted, 0.5),
          p90Days: percentile(sorted, 0.9),
          period,
          prCount: sorted.length,
        };
      })
      .sort((a, b) => (b.period ?? '').localeCompare(a.period ?? ''));
  }

  /**
   * @description Commits per PR (PR size in commits) for merged PRs. Fetches commit count per PR via REST (paginated); caps at maxPrs to respect rate limits.
   */
  async getCommitsPerPr(
    owner: string,
    repo: string,
    options: CommitsPerPrOptions = {},
  ): Promise<CommitsPerPrRow[]> {
    const maxPrs = options.maxPrs ?? 100;
    const periodKind = options.period;

    const mergedPulls = await this.githubService.listAllPulls(owner, repo, {
      merged: true,
      state: 'closed',
    });
    const toFetch = mergedPulls.slice(0, maxPrs);

    const rows = await Promise.all(
      toFetch.map(async (p) => {
        const commits = await this.githubService.getPullCommitCount(
          owner,
          repo,
          p.number,
        );
        const mergedAt = p.mergedAt ?? null;
        const period =
          periodKind !== undefined && mergedAt !== null
            ? toPeriodBucket(mergedAt, periodKind)
            : null;
        return {
          commits,
          mergedAt,
          period,
          prNumber: p.number,
        };
      }),
    );

    return rows.sort(
      (a, b) =>
        (b.mergedAt ?? '').localeCompare(a.mergedAt ?? '') ||
        b.prNumber - a.prNumber,
    );
  }
}
