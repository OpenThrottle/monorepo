/**
 * @description One issue or PR from GET /repos/:owner/:repo/issues with labels; used for PR counts by label (filter to items that are PRs client-side).
 */
export interface IssueWithLabelsDto {
  readonly labels: readonly string[];
  readonly number: number;
  readonly state: 'open' | 'closed';
}
