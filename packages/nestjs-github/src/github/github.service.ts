import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IssueWithLabelsDto } from './dto/issue-with-labels.dto';
import type { PullDetailDto } from './dto/pull-detail.dto';
import type { PullListItemDto } from './dto/pull-list-item.dto';
import type { PullReviewDto, PullReviewState } from './dto/pull-review.dto';

/** GitHub REST API pull request list item (subset we use). */
interface GitHubPullItem {
  readonly base?: { readonly ref: string } | null;
  readonly created_at: string;
  readonly head?: { readonly ref: string; readonly sha?: string } | null;
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

/**
 * Hard cap on pages fetched by {@link GitHubService.listAllPulls}. At 100 PRs
 * per page this bounds a single aggregation at 1000 PRs (10 requests) so a very
 * large repo cannot trigger an unbounded request loop. Stats over repos with
 * more than this many matching PRs are truncated to the most recent window.
 */
export const LIST_ALL_PULLS_MAX_PAGES = 10;

/**
 * Hard cap on pages fetched by the per-resource recursive paginators
 * ({@link GitHubService.listIssues}, {@link GitHubService.getPullCommitCount},
 * {@link GitHubService.getPullReviews}). At 100 items per page this bounds each
 * aggregation at 1000 items (10 requests) so a repo (or PR) with thousands of
 * issues/commits/reviews cannot trigger an unbounded loop of sequential
 * blocking calls in a single resolver. Results beyond the cap are dropped.
 */
export const GITHUB_PAGINATION_MAX_PAGES = 10;

/**
 * Default per-request timeout (ms) applied to every GitHub fetch when
 * `GITHUB_REQUEST_TIMEOUT_MS` is unset. A hung upstream TCP connection would
 * otherwise block the NestJS handler indefinitely and, under the `Promise.all`
 * fan-outs in github-stats.service.ts, tie up many in-flight requests at once.
 */
export const GITHUB_REQUEST_TIMEOUT_DEFAULT_MS = 10_000;

/**
 * Default number of *retries* (in addition to the initial attempt) applied to a
 * GitHub request that returns a retryable status (429 / secondary-rate-limit
 * 403 / 5xx) when `GITHUB_MAX_RETRIES` is unset. Bounded so a persistently
 * failing upstream cannot turn one logical call into an unbounded retry storm.
 */
export const GITHUB_MAX_RETRIES_DEFAULT = 3;

/**
 * Default base backoff (ms) used for exponential backoff when GitHub does not
 * send a `Retry-After` / `X-RateLimit-Reset` hint, applied when
 * `GITHUB_RETRY_BASE_DELAY_MS` is unset. Attempt N waits roughly
 * `base * 2^N` (plus jitter), capped by {@link GITHUB_RETRY_MAX_DELAY_MS}.
 */
export const GITHUB_RETRY_BASE_DELAY_DEFAULT_MS = 1_000;

/**
 * Hard ceiling (ms) on any single backoff wait, including one derived from a
 * server-supplied `Retry-After` / `X-RateLimit-Reset`. Prevents a hostile or
 * misconfigured header (e.g. `Retry-After: 86400`) from parking a request for
 * an unreasonable amount of time.
 */
export const GITHUB_RETRY_MAX_DELAY_MS = 30_000;

/** Rate-limit telemetry parsed from `X-RateLimit-*` response headers. */
export interface GitHubRateLimitInfo {
  /** Remaining requests in the current window, or null if not advertised. */
  readonly remaining: number | null;
  /** Unix epoch seconds when the window resets, or null if not advertised. */
  readonly resetEpochSeconds: number | null;
}

/** HTTP statuses that are safe to retry with backoff. */
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([
  429, 500, 502, 503, 504,
]);

/** GitHub compare status of `head` relative to `base` (GET .../compare/{base}...{head}). */
export type GitHubCompareStatus = 'ahead' | 'behind' | 'diverged' | 'identical';

const GITHUB_COMPARE_STATUSES: readonly GitHubCompareStatus[] = [
  'ahead',
  'behind',
  'diverged',
  'identical',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCompareStatus = (value: unknown): value is GitHubCompareStatus =>
  typeof value === 'string' &&
  GITHUB_COMPARE_STATUSES.some((status) => status === value);

@Injectable()
export class GitHubService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Builds the standard GitHub REST request headers, reading `GITHUB_TOKEN`
   * from config and attaching it as a bearer token when present. Centralizing
   * this removes the copy-pasted token-read + headers block that previously
   * lived in every service method and keeps the auth/version headers in one
   * place.
   */
  private buildHeaders(): Record<string, string> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Resolves the configured per-request timeout, falling back to
   * {@link GITHUB_REQUEST_TIMEOUT_DEFAULT_MS} when unset or invalid.
   */
  private getRequestTimeoutMs(): number {
    const configured = this.config.get<number>('GITHUB_REQUEST_TIMEOUT_MS');
    if (
      typeof configured === 'number' &&
      Number.isFinite(configured) &&
      configured > 0
    ) {
      return configured;
    }
    return GITHUB_REQUEST_TIMEOUT_DEFAULT_MS;
  }

  /**
   * Resolves a positive-integer config value, falling back to `fallback` when
   * unset, non-numeric, or out of range.
   */
  private getPositiveIntConfig(key: string, fallback: number): number {
    const configured = this.config.get<number>(key);
    if (
      typeof configured === 'number' &&
      Number.isFinite(configured) &&
      configured >= 0
    ) {
      return configured;
    }
    return fallback;
  }

  /**
   * Performs a single timed `fetch`. A timeout abort is translated into a
   * {@link GatewayTimeoutException} (504) rather than surfacing as a raw
   * `AbortError`.
   */
  private async fetchOnce(
    url: string,
    headers: Record<string, string>,
  ): Promise<Response> {
    const timeoutMs = this.getRequestTimeoutMs();
    try {
      return await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayTimeoutException(
          `GitHub request timed out after ${timeoutMs}ms: ${url}`,
        );
      }
      throw error;
    }
  }

  /**
   * Centralized GitHub fetch with timeout (via {@link fetchOnce}) plus bounded,
   * `Retry-After`-aware backoff retries on secondary-rate-limit (429), abuse
   * (403 with a rate-limit signal), and transient 5xx responses. The number of
   * retries and backoff timings are configurable (`GITHUB_MAX_RETRIES`,
   * `GITHUB_RETRY_BASE_DELAY_MS`). On the final attempt the response is returned
   * as-is so existing callers keep their `!res.ok` error handling.
   */
  private async fetchWithTimeout(
    url: string,
    headers: Record<string, string>,
  ): Promise<Response> {
    const maxRetries = this.getPositiveIntConfig(
      'GITHUB_MAX_RETRIES',
      GITHUB_MAX_RETRIES_DEFAULT,
    );
    const baseDelayMs = this.getPositiveIntConfig(
      'GITHUB_RETRY_BASE_DELAY_MS',
      GITHUB_RETRY_BASE_DELAY_DEFAULT_MS,
    );

    // attempt 0 is the initial try; up to `maxRetries` further attempts.
    let res = await this.fetchOnce(url, headers);
    for (
      let attempt = 0;
      attempt < maxRetries && isRetryableResponse(res);
      attempt += 1
    ) {
      const delayMs = backoffDelayMs(res, attempt, baseDelayMs);
      // eslint-disable-next-line no-await-in-loop -- retries are intentionally sequential
      await sleep(delayMs);
      // eslint-disable-next-line no-await-in-loop -- retries are intentionally sequential
      res = await this.fetchOnce(url, headers);
    }
    return res;
  }

  /**
   * Reads `X-RateLimit-Remaining` / `X-RateLimit-Reset` off a GitHub response so
   * callers can degrade gracefully (e.g. stop fanning out) as the budget
   * approaches zero. Returns nulls when the headers are absent (or the response
   * is a test stub without a real `Headers` object).
   */
  readRateLimit(res: Response): GitHubRateLimitInfo {
    return parseRateLimit(res);
  }

  /**
   * @description List pull requests for a repo; optional state, base branch, and merged filter.
   */
  async listPulls(
    owner: string,
    repo: string,
    options: ListPullsOptions,
  ): Promise<PullListItemDto[]> {
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

    const res = await this.fetchWithTimeout(
      url.toString(),
      this.buildHeaders(),
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = parsePullItemArray(await res.json());
    let list = data.map((p) => toPullListItemDto(p));

    if (mergedFilter === true) {
      list = list.filter((p) => p.mergedAt !== null);
    } else if (mergedFilter === false) {
      list = list.filter((p) => p.mergedAt === null);
    }

    return list;
  }

  /**
   * @description Lists pull requests across all pages (paginates, mirroring listIssues/getPullReviews) so analytics see full history instead of an arbitrary first 100. Stops after LIST_ALL_PULLS_MAX_PAGES pages (1000 PRs) to bound API usage; results beyond the cap are dropped.
   */
  async listAllPulls(
    owner: string,
    repo: string,
    options: ListPullsOptions,
  ): Promise<PullListItemDto[]> {
    const state = options.state;
    const base = options.base;
    const mergedFilter = options.merged;

    const headers = this.buildHeaders();

    const perPage = 100;

    const fetchPage = async (page: number): Promise<PullListItemDto[]> => {
      const url = new URL(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
      );
      url.searchParams.set('state', state);
      if (base !== undefined && base !== '') {
        url.searchParams.set('base', base);
      }
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('page', String(page));

      const res = await this.fetchWithTimeout(url.toString(), headers);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `GitHub API error ${res.status}: ${text.slice(0, 200)}`,
        );
      }

      const data = parsePullItemArray(await res.json());
      const pageResults = data.map((p) => toPullListItemDto(p));

      if (data.length < perPage || page >= LIST_ALL_PULLS_MAX_PAGES) {
        return pageResults;
      }

      return [...pageResults, ...(await fetchPage(page + 1))];
    };

    const all = await fetchPage(1);

    if (mergedFilter === true) {
      return all.filter((p) => p.mergedAt !== null);
    }
    if (mergedFilter === false) {
      return all.filter((p) => p.mergedAt === null);
    }
    return all;
  }

  /**
   * @description Fetches one PR by number; maps to the same shape as list pulls (conversation metadata).
   */
  async getPullListItem(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PullListItemDto | null> {
    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`;

    const res = await this.fetchWithTimeout(url, this.buildHeaders());
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = parsePullItem(await res.json());

    return toPullListItemDto(data);
  }

  /**
   * @description Fetches one commit by SHA: per-file status/stats plus a patch
   * when GitHub inlines one (large diffs omit it). Used by the refine-tagging
   * job to classify a plan's landed squash diff. Returns null on 404/422
   * (unknown sha) so callers can skip gracefully.
   */
  async getCommitDetail(
    owner: string,
    repo: string,
    sha: string,
  ): Promise<CommitDetailDto | null> {
    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`;

    const res = await this.fetchWithTimeout(url, this.buildHeaders());
    if (res.status === 404 || res.status === 422) {
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data: unknown = await res.json();
    return parseCommitDetail(data);
  }

  /**
   * @description Returns the repo's default branch (e.g. 'main'), or null if the repo
   * can't be read (404). Used by the work-ledger verifier to test commit reachability.
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string | null> {
    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

    const res = await this.fetchWithTimeout(url, this.buildHeaders());
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data: unknown = await res.json();
    return isRecord(data) && typeof data.default_branch === 'string'
      ? data.default_branch
      : null;
  }

  /**
   * @description Compares `head` against `base` (GET .../compare/{base}...{head}) and returns the
   * status of head relative to base: 'behind'/'identical' means head is reachable from base (landed);
   * 'ahead'/'diverged' means it is not. null on 404 (unknown base or head).
   */
  async compareCommitStatus(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<GitHubCompareStatus | null> {
    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;

    const res = await this.fetchWithTimeout(url, this.buildHeaders());
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data: unknown = await res.json();
    const status = isRecord(data) ? data.status : undefined;
    return isCompareStatus(status) ? status : null;
  }

  /**
   * @description Returns the merge_commit_sha of the merged PR associated with `sha`
   * (GET .../commits/{sha}/pulls), or null when no merged PR is associated. Lets the verifier
   * map a squash-merged branch sha to the squash commit that actually landed on the default branch.
   */
  async getMergeCommitShaForCommit(
    owner: string,
    repo: string,
    sha: string,
  ): Promise<string | null> {
    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}/pulls`;

    const res = await this.fetchWithTimeout(url, this.buildHeaders());
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) {
      return null;
    }

    for (const pull of data) {
      if (
        isRecord(pull) &&
        pull.merged_at != null &&
        typeof pull.merge_commit_sha === 'string'
      ) {
        return pull.merge_commit_sha;
      }
    }

    return null;
  }

  /**
   * @description Fetches a single PR by number; includes additions, deletions, changed_files (not on list endpoint).
   */
  async getPullDetail(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PullDetailDto> {
    const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`;

    const res = await this.fetchWithTimeout(url, this.buildHeaders());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = parsePullDetail(await res.json());

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
    const state = options.state;

    const headers = this.buildHeaders();

    const perPage = 100;

    const fetchPage = async (page: number): Promise<IssueWithLabelsDto[]> => {
      const url = new URL(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      );
      url.searchParams.set('state', state);
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('page', String(page));

      const res = await this.fetchWithTimeout(url.toString(), headers);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `GitHub API error ${res.status}: ${text.slice(0, 200)}`,
        );
      }

      const data = parseIssueItemArray(await res.json());
      const pageResults: IssueWithLabelsDto[] = [];

      for (const item of data) {
        if (item.pull_request === undefined) continue;
        pageResults.push({
          labels: item.labels.map((l) => l.name),
          number: item.number,
          state: item.state,
        });
      }

      if (data.length < perPage || page >= GITHUB_PAGINATION_MAX_PAGES) {
        return pageResults;
      }

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
    const headers = this.buildHeaders();

    const perPage = 100;

    const fetchPageCount = async (page: number): Promise<number> => {
      const url = new URL(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/commits`,
      );
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('page', String(page));

      const res = await this.fetchWithTimeout(url.toString(), headers);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `GitHub API error ${res.status}: ${text.slice(0, 200)}`,
        );
      }

      const data = parseUnknownArray(await res.json());

      if (data.length < perPage || page >= GITHUB_PAGINATION_MAX_PAGES) {
        return data.length;
      }

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
    const headers = this.buildHeaders();

    const perPage = 100;

    const fetchPage = async (page: number): Promise<PullReviewDto[]> => {
      const url = new URL(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/reviews`,
      );
      url.searchParams.set('per_page', String(perPage));
      url.searchParams.set('page', String(page));

      const res = await this.fetchWithTimeout(url.toString(), headers);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `GitHub API error ${res.status}: ${text.slice(0, 200)}`,
        );
      }

      const data = parseReviewItemArray(await res.json());
      const pageResults = data.map((r) => ({
        state: r.state,
        submittedAt: r.submitted_at,
      }));

      if (data.length < perPage || page >= GITHUB_PAGINATION_MAX_PAGES) {
        return pageResults;
      }

      return [...pageResults, ...(await fetchPage(page + 1))];
    };

    return fetchPage(1);
  }
}

/** Type guard: value exposes a `Headers`-like `get(name)` accessor. */
function hasHeaderGetter(
  value: unknown,
): value is { get(name: string): string | null } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    typeof value.get === 'function'
  );
}

/** Reads a header defensively so test stubs without a `Headers` object work. */
function readHeader(res: Response, name: string): string | null {
  const headers: unknown = res.headers;
  if (hasHeaderGetter(headers)) {
    return headers.get(name);
  }
  return null;
}

/** Parses `X-RateLimit-Remaining` / `X-RateLimit-Reset` into structured info. */
function parseRateLimit(res: Response): GitHubRateLimitInfo {
  const remainingRaw = readHeader(res, 'x-ratelimit-remaining');
  const resetRaw = readHeader(res, 'x-ratelimit-reset');
  const remaining =
    remainingRaw !== null && remainingRaw.trim() !== ''
      ? Number.parseInt(remainingRaw, 10)
      : Number.NaN;
  const reset =
    resetRaw !== null && resetRaw.trim() !== ''
      ? Number.parseInt(resetRaw, 10)
      : Number.NaN;
  return {
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetEpochSeconds: Number.isFinite(reset) ? reset : null,
  };
}

/**
 * True when a response should be retried: a 5xx, a secondary-rate-limit 429,
 * or a 403 that carries a rate-limit signal (GitHub's abuse/primary-limit
 * responses use 403 with `Retry-After` or `X-RateLimit-Remaining: 0`).
 */
function isRetryableResponse(res: Response): boolean {
  const status = res.status;
  if (RETRYABLE_STATUSES.has(status)) {
    return true;
  }
  if (status === 403) {
    const retryAfter = readHeader(res, 'retry-after');
    const remaining = readHeader(res, 'x-ratelimit-remaining');
    return retryAfter !== null || remaining === '0';
  }
  return false;
}

/**
 * Computes the backoff (ms) before the next attempt, preferring a server hint
 * (`Retry-After` seconds, or `X-RateLimit-Reset` epoch seconds) and otherwise
 * using exponential backoff with jitter. Always clamped to
 * {@link GITHUB_RETRY_MAX_DELAY_MS}.
 */
function backoffDelayMs(
  res: Response,
  attempt: number,
  baseDelayMs: number,
): number {
  const retryAfterRaw = readHeader(res, 'retry-after');
  if (retryAfterRaw !== null && retryAfterRaw.trim() !== '') {
    const seconds = Number.parseInt(retryAfterRaw, 10);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return clampDelay(seconds * 1_000);
    }
  }

  const resetRaw = readHeader(res, 'x-ratelimit-reset');
  if (resetRaw !== null && resetRaw.trim() !== '') {
    const resetEpochSeconds = Number.parseInt(resetRaw, 10);
    if (Number.isFinite(resetEpochSeconds)) {
      const waitMs = resetEpochSeconds * 1_000 - Date.now();
      if (waitMs > 0) {
        return clampDelay(waitMs);
      }
    }
  }

  const exponential = baseDelayMs * 2 ** attempt;
  const jitter = Math.floor(Math.random() * baseDelayMs);
  return clampDelay(exponential + jitter);
}

/** Clamps a delay to [0, {@link GITHUB_RETRY_MAX_DELAY_MS}]. */
function clampDelay(ms: number): number {
  if (ms < 0) return 0;
  return Math.min(ms, GITHUB_RETRY_MAX_DELAY_MS);
}

/** Promise-based delay. */
async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Raises a {@link BadGatewayException} (502) when a GitHub response does not
 * match the minimal shape we read. This turns a GitHub error object or schema
 * drift into a typed, attributable upstream error instead of an opaque runtime
 * crash (e.g. `data.map is not a function` or reading a field off `undefined`)
 * deeper in the mapping/aggregation code.
 */
function shapeError(context: string): never {
  throw new BadGatewayException(
    `Unexpected GitHub API response shape for ${context}`,
  );
}

/** Type guard: a non-null object (records and arrays both qualify). */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Validates that the value is an array, returning it as `unknown[]`. */
function parseUnknownArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    shapeError('list response');
  }
  return value;
}

/** Type guard: the minimal fields of a single PR list/detail item we map. */
function isPullItem(value: unknown): value is GitHubPullItem {
  return (
    isObject(value) &&
    typeof value.created_at === 'string' &&
    typeof value.html_url === 'string' &&
    typeof value.number === 'number' &&
    typeof value.title === 'string' &&
    typeof value.updated_at === 'string'
  );
}

/** Validates the minimal fields of a single PR list/detail item we map. */
function parsePullItem(value: unknown): GitHubPullItem {
  if (!isPullItem(value)) {
    shapeError('pull request');
  }
  return value;
}

/** Validates an array of PR list items. */
function parsePullItemArray(value: unknown): GitHubPullItem[] {
  return parseUnknownArray(value).map((item) => parsePullItem(item));
}

/** Type guard: the diff-stat fields read from the single-PR detail endpoint. */
function isPullDetail(value: unknown): value is GitHubPullDetail {
  return (
    isObject(value) &&
    typeof value.additions === 'number' &&
    typeof value.changed_files === 'number' &&
    typeof value.deletions === 'number' &&
    typeof value.number === 'number'
  );
}

/** Validates the diff-stat fields read from the single-PR detail endpoint. */
function parsePullDetail(value: unknown): GitHubPullDetail {
  if (!isPullDetail(value)) {
    shapeError('pull request detail');
  }
  return value;
}

/** Type guard: a single issue/PR item (labels array + number + state) we map. */
function isIssueItem(value: unknown): value is GitHubIssueItem {
  return (
    isObject(value) &&
    Array.isArray(value.labels) &&
    typeof value.number === 'number'
  );
}

/** Validates a single issue/PR item (labels array + number + state) we map. */
function parseIssueItem(value: unknown): GitHubIssueItem {
  if (!isIssueItem(value)) {
    shapeError('issue');
  }
  return value;
}

/** Validates an array of issue/PR items. */
function parseIssueItemArray(value: unknown): GitHubIssueItem[] {
  return parseUnknownArray(value).map((item) => parseIssueItem(item));
}

/** Type guard: a single review item (state + submitted_at) we map. */
function isReviewItem(value: unknown): value is GitHubReviewItem {
  return (
    isObject(value) &&
    typeof value.submitted_at === 'string' &&
    (value.state === 'APPROVED' ||
      value.state === 'CHANGES_REQUESTED' ||
      value.state === 'COMMENT')
  );
}

/** Validates a single review item (state + submitted_at) we map. */
function parseReviewItem(value: unknown): GitHubReviewItem {
  if (!isReviewItem(value)) {
    shapeError('review');
  }
  return value;
}

/** Validates an array of review items. */
function parseReviewItemArray(value: unknown): GitHubReviewItem[] {
  return parseUnknownArray(value).map((item) => parseReviewItem(item));
}

function toPullListItemDto(p: GitHubPullItem): PullListItemDto {
  return {
    author: p.user?.login ?? '',
    baseRef: p.base?.ref ?? null,
    createdAt: p.created_at,
    headRef: p.head?.ref ?? null,
    headSha: p.head?.sha ?? null,
    htmlUrl: p.html_url,
    mergedAt: p.merged_at,
    number: p.number,
    state: p.state,
    title: p.title,
    updatedAt: p.updated_at,
  };
}

/** One changed file of a commit (patch present only when GitHub inlines it). */
export interface CommitFileDto {
  readonly additions: number;
  readonly deletions: number;
  readonly filename: string;
  readonly patch: string | null;
  readonly status: string;
}

/** Commit detail for diff-driven classification (refine-tagging). */
export interface CommitDetailDto {
  readonly additions: number;
  readonly deletions: number;
  readonly files: CommitFileDto[];
  readonly message: string;
  readonly sha: string;
}

function parseCommitDetail(data: unknown): CommitDetailDto | null {
  if (typeof data !== 'object' || data === null) return null;
  const record: Record<string, unknown> = { ...data };
  const sha = record.sha;
  if (typeof sha !== 'string') return null;

  const commit: Record<string, unknown> =
    typeof record.commit === 'object' && record.commit !== null
      ? { ...record.commit }
      : {};
  const message = typeof commit.message === 'string' ? commit.message : '';

  const stats: Record<string, unknown> =
    typeof record.stats === 'object' && record.stats !== null
      ? { ...record.stats }
      : {};
  const additions = typeof stats.additions === 'number' ? stats.additions : 0;
  const deletions = typeof stats.deletions === 'number' ? stats.deletions : 0;

  const files: CommitFileDto[] = [];
  if (Array.isArray(record.files)) {
    for (const entry of record.files) {
      if (typeof entry !== 'object' || entry === null) continue;
      const file: Record<string, unknown> = { ...entry };
      if (typeof file.filename !== 'string') continue;
      files.push({
        additions: typeof file.additions === 'number' ? file.additions : 0,
        deletions: typeof file.deletions === 'number' ? file.deletions : 0,
        filename: file.filename,
        patch: typeof file.patch === 'string' ? file.patch : null,
        status: typeof file.status === 'string' ? file.status : 'modified',
      });
    }
  }

  return { additions, deletions, files, message, sha };
}
