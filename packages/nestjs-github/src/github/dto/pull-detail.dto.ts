/**
 * @description Single PR detail from GET /repos/:owner/:repo/pulls/:number (includes additions, deletions, changed_files).
 */

export interface PullDetailDto {
  readonly additions: number;
  readonly author: string;
  readonly changedFiles: number;
  readonly deletions: number;
  readonly mergedAt: string | null;
  readonly number: number;
}
