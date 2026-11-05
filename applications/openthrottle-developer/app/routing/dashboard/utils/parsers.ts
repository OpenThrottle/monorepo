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
  return GITHUB_ORGS.some((org) => org === value);
}

function isRepoForOrg(org: GithubOrg, repo: string): repo is GithubRepo {
  return GITHUB_REPOSITORIES[org].includes(repo);
}

function defaultRepoFor(owner: GithubOrg): GithubRepo {
  if (owner === DEFAULT_OWNER) {
    return DEFAULT_REPO;
  }
  return GITHUB_REPOSITORIES[owner][0];
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
  const repo = isRepoForOrg(owner, repoRaw) ? repoRaw : defaultRepoFor(owner);

  return { owner, repo };
}
