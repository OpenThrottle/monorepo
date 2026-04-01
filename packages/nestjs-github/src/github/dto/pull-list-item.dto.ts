/**
 * @description One PR in the list returned by GET /github/repos/:owner/:repo/pulls (Cortex UI shape).
 */
export interface PullListItemDto {
  readonly author: string;
  readonly createdAt: string;
  readonly htmlUrl: string;
  readonly mergedAt: string | null;
  readonly number: number;
  readonly state: 'open' | 'closed';
  readonly title: string;
  readonly updatedAt: string;
}
