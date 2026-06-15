import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import { useSearchParams } from 'react-router';
import { DEFAULT_SEARCH_LIMIT } from '~/routing/search/config';
import { GetSearchResultsDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { parseSearchParams } from '~/routing/search/utils/parsers';
import { SearchCard } from '~/routing/search/components/SearchCard';
import { SearchFilters } from '~/routing/search/components/SearchFilters';
import { SearchForm } from '~/routing/search/components/SearchForm';
import { SearchIntroduction } from '~/routing/search/components/SearchIntroduction';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/search._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => {
    const query = match.loaderData?.query ?? '';
    const isEmpty = query === '';

    return isEmpty ? 'Search' : query;
  },
  links: (match) => {
    const query = match.loaderData?.query ?? '';
    if (query === '') return [];

    return [{ children: 'Search', to: '/search' }];
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;
  const searchParams = url?.searchParams ?? new URLSearchParams();

  const params = parseSearchParams(searchParams);
  const { expandRankingDetails, limit, page, q } = params;
  const trimmed = q.trim();

  if (trimmed === '') {
    return {
      expandRankingDetails,
      limit,
      page,
      query: q,
      results: { chunks: [] },
      total: 0,
    };
  }

  const apiLimit = Math.min(100, page * limit);

  const { search } = await executeGraphqlWithAuth(
    args.request,
    GetSearchResultsDocument,
    {
      input: {
        limit: apiLimit,
        query: trimmed,
      },
    },
  );

  const chunks = search.chunks;
  const start = (page - 1) * limit;
  const pageChunks = chunks.slice(start, start + limit);

  return {
    expandRankingDetails,
    limit,
    page,
    query: q,
    results: { chunks: pageChunks },
    total: chunks.length,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Search | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const {
    expandRankingDetails: expandRankingFromLoader,
    limit: pageLimit,
    page,
    query: q,
    results,
    total,
  } = loaderData;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const currentQ = q ?? searchParams.get('q') ?? '';
  const expandRankingDetails =
    expandRankingFromLoader ||
    (searchParams.get('details') ?? '') === 'ranking';

  // Handlers
  const handleExpandRankingChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const next = new URLSearchParams(searchParams);
    if (e.target.checked) {
      next.set('details', 'ranking');
    } else {
      next.delete('details');
    }

    setSearchParams(next, { replace: true });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <SearchIntroduction
        expandRankingDetails={expandRankingDetails}
        hasQuery={Boolean(currentQ)}
        onExpandRankingChange={currentQ ? handleExpandRankingChange : undefined}
      />

      {/* SearchFilters: limit (results per page) wired to URL; future: source filter when API supports it */}
      <SearchFilters />
      {/* SearchForm: query input and GET submit to /search?q=...; pre-fill from current searchParams */}
      <SearchForm
        defaultQuery={currentQ}
        preserveRankingDetails={expandRankingDetails}
      />
      <div className="flex flex-col gap-4">
        {results.chunks.map((result, index) => {
          return (
            <SearchCard
              defaultOpenWhy={expandRankingDetails}
              key={result.id}
              rankMeta={{
                indexOnPage: index,
                page,
                pageSize: pageLimit ?? DEFAULT_SEARCH_LIMIT,
                total,
              }}
              result={result}
            />
          );
        })}
      </div>
      <OpenThrottlePagination
        basePath="/search"
        className="mt-8"
        details={expandRankingDetails ? 'ranking' : undefined}
        limit={pageLimit ?? DEFAULT_SEARCH_LIMIT}
        page={page}
        resultLabel="results"
        search={currentQ || undefined}
        total={total}
      />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
