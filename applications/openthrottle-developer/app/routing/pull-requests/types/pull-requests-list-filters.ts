/**
 * @description URL-derived filters for the pull requests index (toolbar, table, cards share this shape).
 */
export interface PullRequestsListFilters {
  readonly author: string;
  readonly authorExact: boolean;
  readonly base: string;
  readonly merged: boolean | undefined;
  readonly owner: string;
  readonly repo: string;
  readonly state: 'all' | 'closed' | 'open';
}
