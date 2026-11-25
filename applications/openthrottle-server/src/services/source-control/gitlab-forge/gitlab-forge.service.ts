import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isRecord } from '@openthrottle/nodejs-utils';

import { FORGE_KIND } from '../source-control.constants.ts';
import type {
  ForgeCommitDetail,
  ForgeCommitFile,
  ForgeCommitSummary,
  ForgeCompareStatus,
  ForgePullRequest,
  SourceControlForge,
} from '../source-control.types.ts';

const GITLAB_DEFAULT_BASE_URL = 'https://gitlab.com';
const GITLAB_REQUEST_TIMEOUT_MS = 15000;
const GITLAB_PAGE_SIZE = 100;
const GITLAB_MAX_COMMIT_PAGES = 10;

const readString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];

  return typeof value === 'string' ? value : '';
};

const readNullableString = (
  record: Record<string, unknown>,
  key: string,
): string | null => {
  const value = record[key];

  return typeof value === 'string' && value !== '' ? value : null;
};

const readNumber = (record: Record<string, unknown>, key: string): number => {
  const value = record[key];

  return typeof value === 'number' ? value : 0;
};

const toRecords = (value: unknown): Record<string, unknown>[] => {
  return Array.isArray(value) ? value.filter(isRecord) : [];
};

/** Lines a unified diff adds or removes, ignoring the `+++` / `---` file headers. */
const countDiffLines = (
  diff: string,
): { additions: number; deletions: number } => {
  let additions = 0;
  let deletions = 0;

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) additions += 1;
    else if (line.startsWith('-')) deletions += 1;
  }

  return { additions, deletions };
};

const fileStatus = (entry: Record<string, unknown>): string => {
  if (entry['new_file'] === true) return 'added';
  if (entry['deleted_file'] === true) return 'removed';
  if (entry['renamed_file'] === true) return 'renamed';

  return 'modified';
};

const toCommitFile = (entry: Record<string, unknown>): ForgeCommitFile => {
  const diff = readString(entry, 'diff');
  const { additions, deletions } = countDiffLines(diff);

  return {
    additions,
    deletions,
    filename: readString(entry, 'new_path'),
    patch: typeof entry['diff'] === 'string' ? diff : null,
    status: fileStatus(entry),
  };
};

const toPullRequest = (mr: Record<string, unknown>): ForgePullRequest => {
  const state = readString(mr, 'state');

  return {
    mergeCommitSha:
      readNullableString(mr, 'merge_commit_sha') ??
      readNullableString(mr, 'squash_commit_sha'),
    mergedAt: readNullableString(mr, 'merged_at'),
    number: readNumber(mr, 'iid'),
    state: state === 'merged' || state === 'closed' ? 'closed' : 'open',
  };
};

/**
 * @description The GitLab forge: {@link SourceControlForge} over the GitLab REST API (v4). `fullName`
 * is the full project path (`group/subgroup/project`), URL-encoded into the project id. Config is read
 * per request: `GITLAB_BASE_URL` (default gitlab.com; set it for self-hosted) and an optional
 * `GITLAB_TOKEN`. A 404 resolves to null or [] ; any other failure throws.
 */
@Injectable()
export class GitLabForgeService implements SourceControlForge {
  readonly kind = FORGE_KIND.GITLAB;

  constructor(private readonly config: ConfigService) {}

  /** The hostname of the configured GitLab instance, for mapping git remotes to this forge. */
  get host(): string {
    try {
      return new URL(this.baseUrl()).hostname;
    } catch {
      return new URL(GITLAB_DEFAULT_BASE_URL).hostname;
    }
  }

  commitUrl(fullName: string, sha: string): string {
    return `${this.baseUrl()}/${fullName}/-/commit/${sha}`;
  }

  /**
   * @description `behind` when the compare returns no commits (head is reachable from base),
   * otherwise `ahead`. `diverged` is not distinguished from `ahead`: the ledger only asks "reachable
   * or not", and telling them apart costs a second call.
   */
  async compareCommits(
    fullName: string,
    base: string,
    head: string,
  ): Promise<ForgeCompareStatus | null> {
    if (base === head) return 'identical';

    const query = new URLSearchParams({
      from: base,
      straight: 'false',
      to: head,
    });
    const body = await this.get(
      `${this.project(fullName)}/repository/compare?${query.toString()}`,
    );

    if (body === undefined) return null;

    const commits = isRecord(body) ? body['commits'] : undefined;

    return Array.isArray(commits) && commits.length === 0 ? 'behind' : 'ahead';
  }

  async findPullRequestForBranch(
    fullName: string,
    branch: string,
  ): Promise<ForgePullRequest | null> {
    const query = new URLSearchParams({
      order_by: 'created_at',
      per_page: '1',
      sort: 'desc',
      source_branch: branch,
      state: 'all',
    });
    const body = await this.get(
      `${this.project(fullName)}/merge_requests?${query.toString()}`,
    );
    const newest = toRecords(body)[0];

    return newest === undefined ? null : toPullRequest(newest);
  }

  async getCommit(
    fullName: string,
    sha: string,
  ): Promise<ForgeCommitDetail | null> {
    const path = `${this.project(fullName)}/repository/commits/${encodeURIComponent(sha)}`;
    const commit = await this.get(path);

    if (!isRecord(commit)) return null;

    const diff = await this.get(`${path}/diff?per_page=${GITLAB_PAGE_SIZE}`);
    const stats = isRecord(commit['stats']) ? commit['stats'] : {};

    return {
      additions: readNumber(stats, 'additions'),
      deletions: readNumber(stats, 'deletions'),
      files: toRecords(diff).map(toCommitFile),
      message: readString(commit, 'message'),
      sha: readString(commit, 'id'),
    };
  }

  async getDefaultBranch(fullName: string): Promise<string | null> {
    const project = await this.get(this.project(fullName));

    return isRecord(project)
      ? readNullableString(project, 'default_branch')
      : null;
  }

  async getMergeCommitShaForCommit(
    fullName: string,
    sha: string,
  ): Promise<string | null> {
    const body = await this.get(
      `${this.project(fullName)}/repository/commits/${encodeURIComponent(sha)}/merge_requests`,
    );
    const merged = toRecords(body).find((mr) => mr['state'] === 'merged');

    if (merged === undefined) return null;

    // A fast-forward squash merge has no merge commit; the squash commit is what landed.
    return (
      readNullableString(merged, 'merge_commit_sha') ??
      readNullableString(merged, 'squash_commit_sha')
    );
  }

  async getPullRequest(
    fullName: string,
    number: number,
  ): Promise<ForgePullRequest> {
    const body = await this.get(
      `${this.project(fullName)}/merge_requests/${number}`,
    );

    if (!isRecord(body)) {
      throw new Error(
        `GitLab API error 404: merge request ${fullName}!${number}`,
      );
    }

    return toPullRequest(body);
  }

  async listCommits(
    fullName: string,
    branch: string,
    stopAtSha: string | null,
  ): Promise<ForgeCommitSummary[]> {
    return this.listCommitsPage(fullName, branch, stopAtSha, 1);
  }

  pullRequestUrl(fullName: string, number: number): string {
    return `${this.baseUrl()}/${fullName}/-/merge_requests/${number}`;
  }

  private apiBase(): string {
    return `${this.baseUrl()}/api/v4`;
  }

  private baseUrl(): string {
    const configured = this.config.get<string>('GITLAB_BASE_URL');
    const isConfigured = typeof configured === 'string' && configured !== '';
    const base = isConfigured ? configured : GITLAB_DEFAULT_BASE_URL;

    return base.replace(/\/+$/, '');
  }

  /** GET a path under the API; undefined on 404, parsed JSON otherwise, throws on other errors. */
  private async get(path: string): Promise<unknown> {
    const token = this.config.get<string>('GITLAB_TOKEN');
    const headers: Record<string, string> = {};

    if (typeof token === 'string' && token !== '') {
      headers['PRIVATE-TOKEN'] = token;
    }

    const response = await fetch(`${this.apiBase()}${path}`, {
      headers,
      signal: AbortSignal.timeout(GITLAB_REQUEST_TIMEOUT_MS),
    });

    if (response.status === 404) return undefined;

    if (!response.ok) {
      const text = await response.text();

      throw new Error(
        `GitLab API error ${response.status}: ${text.slice(0, 200)}`,
      );
    }

    return response.json();
  }

  /** Pages are sequential by nature: each decides whether the next is needed. */
  private async listCommitsPage(
    fullName: string,
    branch: string,
    stopAtSha: string | null,
    page: number,
  ): Promise<ForgeCommitSummary[]> {
    const query = new URLSearchParams({
      page: String(page),
      per_page: String(GITLAB_PAGE_SIZE),
      ref_name: branch,
    });
    const body = await this.get(
      `${this.project(fullName)}/repository/commits?${query.toString()}`,
    );
    const rows = toRecords(body);
    const collected: ForgeCommitSummary[] = [];

    for (const row of rows) {
      const sha = readString(row, 'id');

      if (stopAtSha !== null && sha === stopAtSha) return collected;

      collected.push({
        authorLogin: null,
        message: readString(row, 'message'),
        sha,
      });
    }

    if (rows.length < GITLAB_PAGE_SIZE || page >= GITLAB_MAX_COMMIT_PAGES) {
      return collected;
    }

    const rest = await this.listCommitsPage(
      fullName,
      branch,
      stopAtSha,
      page + 1,
    );

    return [...collected, ...rest];
  }

  private project(fullName: string): string {
    return `/projects/${encodeURIComponent(fullName)}`;
  }
}
