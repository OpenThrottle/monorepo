/**
 * @description One review from GET /repos/:owner/:repo/pulls/:number/reviews (state and submitted_at for review cycle time).
 */

/** GitHub review state from REST API. */
export type PullReviewState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENT';

export interface PullReviewDto {
  readonly state: PullReviewState;
  readonly submittedAt: string;
}
/**
 * @description One PR in the list returned by GET /github/repos/:owner/:repo/pulls (OpenThrottle UI shape).
 */
export interface PullListItemDto {
  readonly author: string;
  /**
   * @description Base branch ref (merge target), when GitHub returns `base.ref`.
   */
  readonly baseRef: string | null;
  readonly createdAt: string;
  /**
   * @description Head branch ref (PR branch), when GitHub returns `head.ref`.
   */
  readonly headRef: string | null;
  /**
   * @description Head commit SHA when GitHub returns `head.sha` (links to commit-level checks).
   */
  readonly headSha: string | null;
  readonly htmlUrl: string;
  readonly mergedAt: string | null;
  readonly number: number;
  readonly state: 'open' | 'closed';
  readonly title: string;
  readonly updatedAt: string;
}
/**
 * @description Single PR detail from GET /repos/:owner/:repo/pulls/:number (includes additions, deletions, changed_files).
 */

export interface PullDetailDto {
  readonly additions: number;
  readonly author: string;
  readonly changedFiles: number;
  readonly deletions: number;
  /** Squash/merge commit the PR landed as; null while open, or when GitHub reports none. */
  readonly mergeCommitSha: string | null;
  readonly mergedAt: string | null;
  readonly number: number;
  /** 'open' or 'closed'. A closed PR with no mergedAt was abandoned, not merged. */
  readonly state: string;
}
/**
 * @description One issue or PR from GET /repos/:owner/:repo/issues with labels; used for PR counts by label (filter to items that are PRs client-side).
 */
export interface IssueWithLabelsDto {
  readonly labels: readonly string[];
  readonly number: number;
  readonly state: 'open' | 'closed';
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

/** Rate-limit telemetry parsed from `X-RateLimit-*` response headers. */
export interface GitHubRateLimitInfo {
  /** Remaining requests in the current window, or null if not advertised. */
  readonly remaining: number | null;
  /** Unix epoch seconds when the window resets, or null if not advertised. */
  readonly resetEpochSeconds: number | null;
}

/** GitHub compare status of `head` relative to `base` (GET .../compare/{base}...{head}). */
export type GitHubCompareStatus = 'ahead' | 'behind' | 'diverged' | 'identical';

/** One changed file of a commit (patch present only when GitHub inlines it). */
export interface CommitFileDto {
  readonly additions: number;
  readonly deletions: number;
  readonly filename: string;
  readonly patch: string | null;
  readonly status: string;
}

/** A commit as the list endpoint returns it: identity, message, and GitHub's author login. */
export interface CommitSummaryDto {
  /** GitHub account login of the commit author; null when GitHub cannot attribute it. */
  readonly authorLogin: string | null;
  /** Full commit message, including trailers. */
  readonly message: string;
  readonly sha: string;
}

/** Commit detail for diff-driven classification (refine-tagging). */
export interface CommitDetailDto {
  readonly additions: number;
  readonly deletions: number;
  readonly files: CommitFileDto[];
  readonly message: string;
  readonly sha: string;
}
