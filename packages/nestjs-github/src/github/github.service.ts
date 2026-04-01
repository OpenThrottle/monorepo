/* eslint-disable @typescript-eslint/consistent-type-assertions -- GitHub REST JSON responses lack runtime schema; assertions match documented API shapes */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IssueWithLabelsDto } from './dto/issue-with-labels.dto';
import type { PullDetailDto } from './dto/pull-detail.dto';
import type { PullListItemDto } from './dto/pull-list-item.dto';
import type { PullReviewDto, PullReviewState } from './dto/pull-review.dto';

/** GitHub REST API pull request list item (subset we use). */
interface GitHubPullItem {
  readonly created_at: string;
  readonly html_url: string;
  readonly merged_at: string | null;
  readonly number: number;
  readonly state: 'open' | 'closed';
  readonly title: string;
  readonly updated_at: string;
  readonly user: { readonly login: string } | null;
}

/** GitHub REST API single PR response (GET .../pulls/{number}) includes diff stats. */
interface GitHubPullDetail {
  readonly additions: number;
  readonly changed_files: number;
  readonly deletions: number;
  readonly merged_at: string | null;
  readonly number: number;
  readonly user: { readonly login: string } | null;
}

/** GitHub REST API issue/PR list item (GET .../issues); PRs include pull_request. */
interface GitHubIssueItem {
  readonly labels: ReadonlyArray<{ readonly name: string }>;
  readonly number: number;
  readonly pull_request?: unknown;
  readonly state: 'open' | 'closed';
}

/** GitHub REST API review (GET .../pulls/{number}/reviews). */
interface GitHubReviewItem {
  readonly state: PullReviewState;
  readonly submitted_at: string;
}

/** Query params for listing PRs: state (open | closed | all), optional base branch, optional merged filter. */
export interface ListPullsOptions {
  readonly base?: string;
  readonly merged?: boolean;
  readonly state: 'all' | 'closed' | 'open';
}

/** Options for listing issues (includes PRs; filter to PRs client-side for label counts). */
export interface ListIssuesOptions {
  readonly state: 'all' | 'closed' | 'open';
}

const GITHUB_API_BASE = 'https://api.github.com';

@Injectable()
export class GitHubService {
  constructor(private readonly config: ConfigService) {}

  /**
   * @description List pull requests for a repo; optional state, base branch, and merged filter.
   */
  async listPulls(
    owner: string,
    repo: string,
    options: ListPullsOptions,
  ): Promise<PullListItemDto[]> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    const state = options.state;
    const base = options.base;
    const mergedFilter = options.merged;

    const url = new URL(
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
    );
    url.searchParams.set('state', state);
    if (base !== undefined && base !== '') {
      url.searchParams.set('base', base);
    }
    url.searchParams.set('per_page', '100');

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as GitHubPullItem[];
    let list = data.map((p) => toPullListItemDto(p));

    if (mergedFilter === true) {
      list = list.filter((p) => p.mergedAt !== null);
    } else if (mergedFilter === false) {
      list = list.filter((p) => p.mergedAt === null);
    }

    return list;
  }

  /**
   * @description Fetches a single PR by number; includes additions, deletions, changed_files (not on list endpoint).
   */
  async getPullDetail(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PullDetailDto> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as GitHubPullDetail;
    return {
      additions: data.additions,
      author: data.user?.login ?? '',
      changedFiles: data.changed_files,
      deletions: data.deletions,
      mergedAt: data.merged_at,
      number: data.number,
    };
  }

  /**
   * @description List issues for a repo (includes PRs). Returns only items that are PRs (have pull_request), with labels, for aggregation by label. Paginates until no more pages.
   */
  async listIssues(
    owner: string,
    repo: string,
    options: ListIssuesOptions = { state: 'all' },
  ): Promise<IssueWithLabelsDto[]> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    const state = options.state;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const perPage = 100;

    const fetchPage = async (page: number): Promise<IssueWithLabelsDto[]> => {
      const url = new URL(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      );
      url.searchParams.set('state', state);
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('page', String(page));

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `GitHub API error ${res.status}: ${text.slice(0, 200)}`,
        );
      }

      const data = (await res.json()) as GitHubIssueItem[];
      const pageResults: IssueWithLabelsDto[] = [];
      for (const item of data) {
        if (item.pull_request === undefined) continue;
        pageResults.push({
          labels: item.labels.map((l) => l.name),
          number: item.number,
          state: item.state,
        });
      }
      if (data.length < perPage) return pageResults;
      return [...pageResults, ...(await fetchPage(page + 1))];
    };

    return fetchPage(1);
  }

  /**
   * @description Returns the number of commits on a PR. Uses REST GET .../pulls/{id}/commits with pagination to count (no totalCount in response).
   */
  async getPullCommitCount(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<number> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const perPage = 100;

    const fetchPageCount = async (page: number): Promise<number> => {
      const url = new URL(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/commits`,
      );
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('page', String(page));

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `GitHub API error ${res.status}: ${text.slice(0, 200)}`,
        );
      }

      const data = (await res.json()) as ReadonlyArray<unknown>;
      if (data.length < perPage) return data.length;
      return data.length + (await fetchPageCount(page + 1));
    };

    return fetchPageCount(1);
  }

  /**
   * @description Fetches all reviews for a PR (paginated). Each review has state (APPROVED, CHANGES_REQUESTED, COMMENT) and submitted_at for review cycle time.
   */
  async getPullReviews(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PullReviewDto[]> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const perPage = 100;

    const fetchPage = async (page: number): Promise<PullReviewDto[]> => {
      const url = new URL(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/reviews`,
      );
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('page', String(page));

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `GitHub API error ${res.status}: ${text.slice(0, 200)}`,
        );
      }

      const data = (await res.json()) as GitHubReviewItem[];
      const pageResults = data.map((r) => ({
        state: r.state,
        submittedAt: r.submitted_at,
      }));
      if (data.length < perPage) return pageResults;
      return [...pageResults, ...(await fetchPage(page + 1))];
    };

    return fetchPage(1);
  }
}

function toPullListItemDto(p: GitHubPullItem): PullListItemDto {
  return {
    author: p.user?.login ?? '',
    createdAt: p.created_at,
    htmlUrl: p.html_url,
    mergedAt: p.merged_at,
    number: p.number,
    state: p.state,
    title: p.title,
    updatedAt: p.updated_at,
  };
}
