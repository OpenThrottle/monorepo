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
