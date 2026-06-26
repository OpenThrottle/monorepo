import {
  GITHUB_ORGS,
  GITHUB_REPOSITORIES,
  type GithubOrg,
  type GithubRepo,
} from '~/routing/dashboard/config/config.dashboard';

const DEFAULT_OWNER: GithubOrg = 'openthrottle';
const DEFAULT_REPO: GithubRepo = 'monorepo';

/** Parsed dashboard GitHub owner and repository from URL search params. */
interface ParsedDashboardGithubParams {
  readonly owner: GithubOrg;
  readonly repo: GithubRepo;
}

function isGithubOrg(value: string): value is GithubOrg {
  return (GITHUB_ORGS as readonly string[]).includes(value);
}

function isRepoForOrg(org: GithubOrg, repo: string): repo is GithubRepo {
  return GITHUB_REPOSITORIES[org].includes(repo);
}

/**
 * @description Parses and validates `owner` and `repo` from URL search params.
 */
export function parseDashboardGithubParams(
  searchParams: URLSearchParams,
): ParsedDashboardGithubParams {
  const ownerRaw = searchParams.get('owner') ?? '';
  const owner = isGithubOrg(ownerRaw) ? ownerRaw : DEFAULT_OWNER;

  const repoRaw = searchParams.get('repo') ?? '';
  const reposForOwner = GITHUB_REPOSITORIES[owner];
  const repo = isRepoForOrg(owner, repoRaw)
    ? repoRaw
    : owner === DEFAULT_OWNER
      ? DEFAULT_REPO
      : reposForOwner[0];

  return { owner, repo };
}
