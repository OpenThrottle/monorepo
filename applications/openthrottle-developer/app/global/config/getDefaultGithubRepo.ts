/**
 * @description Default GitHub owner/repo for PR list and detail when query params are omitted.
 * Server-side only (loader); override with `?owner=&repo=` on pull request routes.
 */
export const getDefaultGithubRepo = (): {
  readonly owner: string;
  readonly repo: string;
} => {
  return {
    owner: process.env.OPENTHROTTLE_GITHUB_OWNER ?? 'openthrottle',
    repo: process.env.OPENTHROTTLE_GITHUB_REPO ?? 'monorepo',
  };
};
