import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { useSearchParams } from 'react-router';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { DEFAULT_SEARCH_LIMIT } from '~/routing/search/config';
import { GetSearchResultsDocument } from '~/__generated__/graphql';
import { parseSearchParams } from '~/routing/search/utils/parsers';
import { SearchCard } from '~/routing/search/components/SearchCard';
import { SearchFilters } from '~/routing/search/components/SearchFilters';
import { SearchForm } from '~/routing/search/components/SearchForm';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/search._index';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.request.url ? new URL(args.request.url) : null;
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const { limit, page, q } = parseSearchParams(searchParams);

  const { search: results } = await executeGraphqlWithAuth(
    args.request,
    GetSearchResultsDocument,
    {
      input: {
        limit,
        query: q,
      },
    },
  );

  return { page, query: q, results };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Search | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { page, query: q, results } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup — utils: parseSearchParams for pre-fill; config: DEFAULT_SEARCH_LIMIT for pagination
  const currentQ = q ?? searchParams.get('q') ?? '';
  const total = results.chunks.length;

  return (
    <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
      <h1 className="text-xl my-4 text-highlight">Search</h1>

      {!currentQ && (
        <p className="text-muted-foreground">Enter a query to search.</p>
      )}

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
        limit={DEFAULT_SEARCH_LIMIT}
        page={page}
        search={currentQ || undefined}
        total={total}
      />
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
