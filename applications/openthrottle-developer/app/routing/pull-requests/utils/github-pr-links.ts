/**
 * @description GitHub URLs for merge and CI debugging from owner, repo, and PR number.
 */

export const githubPullChecksUrl = (
  owner: string,
  repo: string,
  number: number,
): string => `https://github.com/${owner}/${repo}/pull/${number}/checks`;

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
