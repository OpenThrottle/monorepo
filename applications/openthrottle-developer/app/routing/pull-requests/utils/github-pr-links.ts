/**
 * @description GitHub URLs for merge and CI debugging from owner, repo, and PR number.
 */

export const githubPullChecksUrl = (
  owner: string,
  repo: string,
  number: number,
): string => `https://github.com/${owner}/${repo}/pull/${number}/checks`;

/**
 * @description Compare two refs (base...head) for merge-preview and diff debugging.
 */
export const githubPullCompareUrl = (
  owner: string,
  repo: string,
  baseRef: string,
  headRef: string,
): string =>
  `https://github.com/${owner}/${repo}/compare/${encodeURIComponent(baseRef)}...${encodeURIComponent(headRef)}`;

/**
 * @description Commits on the PR; each row links to per-commit check status in the GitHub UI.
 */
export const githubPullCommitsUrl = (
  owner: string,
  repo: string,
  number: number,
): string => `https://github.com/${owner}/${repo}/pull/${number}/commits`;

export const githubPullConversationUrl = (
  owner: string,
  repo: string,
  number: number,
): string => `https://github.com/${owner}/${repo}/pull/${number}`;

export const githubPullFilesUrl = (
  owner: string,
  repo: string,
  number: number,
): string => `https://github.com/${owner}/${repo}/pull/${number}/files`;

export const githubRepoActionsUrl = (owner: string, repo: string): string =>
  `https://github.com/${owner}/${repo}/actions`;

/**
 * @description Actions runs filtered to a branch ref (same query syntax as the GitHub UI).
 */
export const githubRepoActionsForBranchUrl = (
  owner: string,
  repo: string,
  branchRef: string,
): string =>
  `https://github.com/${owner}/${repo}/actions?query=${encodeURIComponent(
    `branch:${branchRef}`,
  )}`;

/**
 * @description Workflow runs filtered to pull_request events (matches Actions UI search).
 */
export const githubRepoActionsPullRequestRunsUrl = (
  owner: string,
  repo: string,
): string =>
  `https://github.com/${owner}/${repo}/actions?query=${encodeURIComponent('event:pull_request')}`;

/**
 * @description Default branch .github/workflows (HEAD resolves like the GitHub tree UI).
 */
export const githubRepoWorkflowsDirUrl = (
  owner: string,
  repo: string,
): string => `https://github.com/${owner}/${repo}/tree/HEAD/.github/workflows`;
