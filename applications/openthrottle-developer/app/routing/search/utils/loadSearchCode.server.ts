import {
  executeGraphqlWithAuth,
  isGraphqlForbiddenError,
} from '@openthrottle/react-router-graphql';
import { redirect } from 'react-router';

import type { SearchCodeRepositoryFragment } from '~/__generated__/graphql';
import {
  GetSearchCodeIndexStatusDocument,
  GetSearchCodeRepositoriesDocument,
  GetSearchCodeResultsDocument,
} from '~/__generated__/graphql';
import { SEARCH_SCOPE } from '~/routing/search/config';
import type { SearchIndexCodeData } from '~/routing/search/types/search-index';
import {
  isCodeIndexSearchable,
  resolveCodeSearchRepository,
  toCodeSearchRepositories,
} from '~/routing/search/utils/code-search';
import type { ParsedSearchParams } from '~/routing/search/utils/parsers';
import { buildSearchUrl } from '~/routing/search/utils/parsers';

/**
 * @description The offered repositories, or null when the caller may not list them: listing needs
 * `settings:read`, while searching needs only `code:read`, so a refusal becomes a notice, not an
 * error page.
 */
const loadCodeSearchRepositories = async (
  request: Request,
): Promise<SearchCodeRepositoryFragment[] | null> => {
  try {
    const { workspaceLocalRepositories } = await executeGraphqlWithAuth(
      request,
      GetSearchCodeRepositoriesDocument,
      {},
    );

    return toCodeSearchRepositories(workspaceLocalRepositories);
  } catch (error) {
    if (isGraphqlForbiddenError(error)) {
      return null;
    }

    throw error;
  }
};

/**
 * @description The code scope of the /search loader: the offered repositories, the selected
 * one's index status, and — with a query against a searchable index — one ranked page.
 */
export const loadSearchCode = async (
  request: Request,
  params: ParsedSearchParams,
): Promise<SearchIndexCodeData> => {
  const { expandRankingDetails, limit, page, q, repositoryId } = params;
  const trimmed = q.trim();
  const listed = await loadCodeSearchRepositories(request);
  const canListRepositories = listed !== null;
  const repositories = listed ?? [];
  const repository = resolveCodeSearchRepository(repositories, repositoryId);
  const base = { expandRankingDetails, limit, page, query: q };

  if (repository === null) {
    return {
      ...base,
      code: {
        available: true,
        canListRepositories,
        index: null,
        matches: [],
        repositories,
        repository,
      },
      scope: SEARCH_SCOPE.code,
      stats: { index: null, kind: 'code', total: null },
      total: 0,
    };
  }

  const { codeIndexStatus } = await executeGraphqlWithAuth(
    request,
    GetSearchCodeIndexStatusDocument,
    { repositoryId: repository.id },
  );
  const isUnavailable =
    codeIndexStatus.status === 'unavailable' ||
    codeIndexStatus.status === 'hostedOptInRequired';
  const canSearch = trimmed !== '' && isCodeIndexSearchable(codeIndexStatus);

  if (!canSearch) {
    return {
      ...base,
      code: {
        available: !isUnavailable,
        canListRepositories,
        index: codeIndexStatus,
        matches: [],
        repositories,
        repository,
      },
      scope: SEARCH_SCOPE.code,
      stats: {
        index: codeIndexStatus,
        kind: 'code',
        total: trimmed === '' ? null : 0,
      },
      total: 0,
    };
  }

  const { codeSemanticSearch } = await executeGraphqlWithAuth(
    request,
    GetSearchCodeResultsDocument,
    {
      input: {
        limit,
        offset: (page - 1) * limit,
        query: trimmed,
        repositoryId: repository.id,
      },
    },
  );
  const { available, matches, total } = codeSemanticSearch;
  const lastPage = Math.max(1, Math.ceil(total / limit));

  if (page > lastPage) {
    throw redirect(
      buildSearchUrl(q, lastPage, limit, {
        repositoryId: repository.id,
        scope: SEARCH_SCOPE.code,
      }),
    );
  }

  return {
    ...base,
    code: {
      available,
      canListRepositories,
      index: codeIndexStatus,
      matches,
      repositories,
      repository,
    },
    scope: SEARCH_SCOPE.code,
    stats: { index: codeIndexStatus, kind: 'code', total },
    total,
  };
};
