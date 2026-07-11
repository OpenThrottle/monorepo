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
