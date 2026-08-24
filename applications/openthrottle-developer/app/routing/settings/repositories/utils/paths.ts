/** Path to a repository's detail page under settings. */
export const repositoryDetailPath = (repositoryId: string): string =>
  `/settings/repositories/${repositoryId}`;

/**
 * Path to the plan a live run belongs to. The Developer app has no plan-RUN detail
 * route, so a running worktree links to its plan.
 */
export const planDetailPath = (planId: string): string => `/plans/${planId}`;
