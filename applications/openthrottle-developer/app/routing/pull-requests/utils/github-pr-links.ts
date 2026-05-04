/**
 * @description GitHub URLs for merge and CI debugging from owner, repo, and PR number.
 */

export const githubPullChecksUrl = (
  owner: string,
  repo: string,
  number: number,
): string => `https://github.com/${owner}/${repo}/pull/${number}/checks`;

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
