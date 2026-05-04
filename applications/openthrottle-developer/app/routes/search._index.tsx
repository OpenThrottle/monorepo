import * as React from 'react';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { useSearchParams } from 'react-router';
import { GetSearchResultsDocument } from '~/__generated__/graphql';
import { DEFAULT_SEARCH_LIMIT } from '~/routing/search/config';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { parseSearchParams } from '~/routing/search/utils/parsers';
import { SearchCard } from '~/routing/search/components/SearchCard';
import { SearchFilters } from '~/routing/search/components/SearchFilters';
import { SearchForm } from '~/routing/search/components/SearchForm';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/search._index';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => _match?.loaderData?.query ?? 'Search',
  links: (_match) => [{ children: 'Search', to: '/search' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.request.url ? new URL(args.request.url) : null;
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const { limit, page, q } = parseSearchParams(searchParams);
  const trimmed = q.trim();

  if (trimmed === '') {
    return { limit, page, query: q, results: { chunks: [] }, total: 0 };
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
    limit,
    page,
    query: q,
    results: { chunks: pageChunks },
    total: chunks.length,
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Search | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { limit: pageLimit, page, query: q, results, total } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup — utils: parseSearchParams for pre-fill; config: DEFAULT_SEARCH_LIMIT for pagination
  const currentQ = q ?? searchParams.get('q') ?? '';

  return (
    <GlobalScreen>
      <h1 className="text-xl my-4 text-highlight">Search</h1>

      {!currentQ && (
        <p className="text-muted-foreground">Enter a query to search.</p>
      )}

      {currentQ ? (
        <p className="text-muted-foreground text-sm max-w-2xl mb-2">
          Semantic search over embedded plan, task, and documentation chunks.
          Open “Why this result?” on a card to see ranking notes and chunk
          metadata.
        </p>
      ) : null}

      {/* SearchFilters: limit (results per page) wired to URL; future: source filter when API supports it */}
      <SearchFilters />
      {/* SearchForm: query input and GET submit to /search?q=...; pre-fill from current searchParams */}
      <SearchForm defaultQuery={currentQ} />
      <div className="flex flex-col gap-4">
        {results.chunks.map((result) => {
          return <SearchCard key={result.id} result={result} />;
        })}
      </div>
      <OpenThrottlePagination
        basePath="/search"
        className="mt-8"
        limit={pageLimit ?? DEFAULT_SEARCH_LIMIT}
        page={page}
        resultLabel="results"
        search={currentQ || undefined}
        total={total}
      />
    </GlobalScreen>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
