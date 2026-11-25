import type {
  SearchCodeIndexStatusFragment,
  SearchCodeMatchFragment,
  SearchCodeRepositoryFragment,
} from '~/__generated__/graphql';
import { SEARCH_CODE_COPY } from '~/routing/search/data/copy';
import { githubBlobHref } from '~/routing/search/utils/githubBlobHref';

/** Index states that still hold searchable chunks. */
const SEARCHABLE_INDEX_STATUSES: ReadonlySet<string> = new Set([
  'failed',
  'indexing',
  'ready',
]);

/**
 * @description `owner/repo` from a GitHub remote (`https://github.com/o/r(.git)` or
 * `git@github.com:o/r.git`); null for any other host or a missing remote.
 */
export const toGithubRepo = (remoteUrl: string | null): string | null => {
  if (remoteUrl === null) {
    return null;
  }

  const match = /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(
    remoteUrl.trim(),
  );
  const owner = match?.[1];
  const repo = match?.[2];

  if (owner === undefined || repo === undefined) {
    return null;
  }

  return `${owner}/${repo}`;
};

/**
 * @description A match's lines on GitHub at the repository's default branch, or null when the
 * repository has no GitHub remote.
 */
export const toCodeMatchHref = (
  repository: SearchCodeRepositoryFragment,
  match: SearchCodeMatchFragment,
): string | null => {
  const repo = toGithubRepo(repository.gitRemoteUrl ?? null);

  if (repo === null) {
    return null;
  }

  const blob = githubBlobHref(repo, match.path, repository.gitDefaultBranch);

  return `${blob}#L${match.startLine}-L${match.endLine}`;
};

/**
 * @description The repositories code search offers: primary checkouts by name (a worktree
 * shares its primary's index), or every checkout when none is primary.
 */
export const toCodeSearchRepositories = (
  repositories: readonly SearchCodeRepositoryFragment[],
): SearchCodeRepositoryFragment[] => {
  const primaries = repositories.filter((repository) => {
    return repository.kind === 'primary';
  });
  const offered = primaries.length > 0 ? primaries : [...repositories];

  return offered.sort((a, b) => a.displayName.localeCompare(b.displayName));
};

/**
 * @description The repository a code search runs against: the requested one when it is
 * offered, otherwise the first offered; null when none is registered.
 */
export const resolveCodeSearchRepository = (
  repositories: readonly SearchCodeRepositoryFragment[],
  repositoryId: string | null,
): SearchCodeRepositoryFragment | null => {
  const requested = repositories.find((repository) => {
    return repository.id === repositoryId;
  });

  return requested ?? repositories[0] ?? null;
};

/** @description True when the index holds chunks a query can search. */
export const isCodeIndexSearchable = (
  index: SearchCodeIndexStatusFragment,
): boolean => {
  return SEARCHABLE_INDEX_STATUSES.has(index.status) && index.indexedChunks > 0;
};

/** @description The label for a code-index status; an unknown status renders as the server sent it. */
export const getCodeIndexStatusLabel = (status: string): string => {
  const labels: Readonly<Record<string, string>> = SEARCH_CODE_COPY.status;

  return labels[status] ?? status;
};

/** Which notice the code scope shows above its results, if any. */
export type CodeSearchNoticeKey =
  'failed' | 'gated' | 'indexing' | 'noRepository' | 'notIndexed';

/**
 * @description The notice for a code-scope state: no repository, code search gated off, or an
 * index that is missing, still building or failed. Null when the index is ready.
 */
export const getCodeSearchNotice = (
  available: boolean,
  index: SearchCodeIndexStatusFragment | null,
): CodeSearchNoticeKey | null => {
  if (index === null) {
    return 'noRepository';
  }

  if (!available) {
    return 'gated';
  }

  if (
    index.status === 'failed' ||
    index.status === 'indexing' ||
    index.status === 'notIndexed'
  ) {
    return index.status;
  }

  return null;
};
