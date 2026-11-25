import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { redirect } from 'react-router';

import {
  GetSearchCorpusDocument,
  GetSearchResultsDocument,
} from '~/__generated__/graphql';
import { SEARCH_SCOPE } from '~/routing/search/config';
import type { SearchIndexLoaderData } from '~/routing/search/types/search-index';
import type {
  SearchStatsCorpusView,
  SearchStatsKnowledgeView,
} from '~/routing/search/types/search-stats';
import { loadSearchCode } from '~/routing/search/utils/loadSearchCode.server';
import {
  buildSearchUrl,
  parseSearchParams,
} from '~/routing/search/utils/parsers';

/**
 * @description The /search loader. Knowledge scope: corpus stats before a query, one ranked page
 * plus its stats after one. Code scope: see {@link loadSearchCode}. Redirects a page past the
 * last back to the last.
 */
export const loadSearchIndex = async (
  request: Request,
  url: URL | undefined,
): Promise<SearchIndexLoaderData> => {
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const params = parseSearchParams(searchParams);
  const { expandRankingDetails, limit, page, q } = params;
  const trimmed = q.trim();

  if (params.scope === SEARCH_SCOPE.code) {
    return loadSearchCode(request, params);
  }

  if (trimmed === '') {
    // Feeds only the collapsible stat cards, so a failure degrades to zeros.
    const corpusResult = await executeGraphqlWithAuth(
      request,
      GetSearchCorpusDocument,
      {},
    ).catch(() => null);
    const corpus: SearchStatsCorpusView = {
      coverage: corpusResult?.serverHealth.embeddings?.coverage ?? [],
      kind: 'corpus',
    };

    return {
      expandRankingDetails,
      limit,
      page,
      query: q,
      results: { chunks: [], reason: null },
      scope: SEARCH_SCOPE.knowledge,
      stats: corpus,
      total: 0,
    };
  }

  const { search } = await executeGraphqlWithAuth(
    request,
    GetSearchResultsDocument,
    {
      input: {
        limit,
        offset: (page - 1) * limit,
        query: trimmed,
      },
    },
  );

  const lastPage = Math.max(1, Math.ceil(search.total / limit));

  if (page > lastPage) {
    throw redirect(
      buildSearchUrl(q, lastPage, limit, {
        detailsRanking: expandRankingDetails,
      }),
    );
  }

  const knowledge: SearchStatsKnowledgeView = {
    kind: 'knowledge',
    mode: search.mode,
    reason: search.reason ?? null,
    sourceCounts: search.sourceCounts,
    total: search.total,
  };

  return {
    expandRankingDetails,
    limit,
    page,
    query: q,
    results: { chunks: search.chunks, reason: search.reason ?? null },
    scope: SEARCH_SCOPE.knowledge,
    stats: knowledge,
    total: search.total,
  };
};
