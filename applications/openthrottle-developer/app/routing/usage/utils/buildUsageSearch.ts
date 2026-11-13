/**
 * @description Shared Usage-route search-param builders so token-usage and
 * skill-usage filters preserve each other's selections across navigation.
 */

export type UsageSearchParams = {
  readonly account?: string | null;
  readonly cwd?: string | null;
  readonly gitBranch?: string | null;
  readonly provider?: string | null;
  /** Normalized git remote; supersedes `cwd` as the project filter. */
  readonly repo?: string | null;
  readonly scope?: string | null;
};

/** Build `?…` for the Usage route, omitting empty/null filter values. */
export const buildUsageSearch = (params: UsageSearchParams): string => {
  const search = new URLSearchParams();

  if (params.provider != null && params.provider !== '') {
    search.set('provider', params.provider);
  }
  if (params.account != null && params.account !== '') {
    search.set('account', params.account);
  }
  if (params.scope != null && params.scope !== '') {
    search.set('skillScope', params.scope);
  }
  if (params.gitBranch != null && params.gitBranch !== '') {
    search.set('skillBranch', params.gitBranch);
  }
  if (params.cwd != null && params.cwd !== '') {
    search.set('skillCwd', params.cwd);
  }
  if (params.repo != null && params.repo !== '') {
    search.set('skillRepo', params.repo);
  }

  const query = search.toString();
  return query === '' ? '?' : `?${query}`;
};
