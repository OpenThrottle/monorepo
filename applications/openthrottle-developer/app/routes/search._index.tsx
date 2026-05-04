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
import { WorkspaceEntityCrossLinks } from '~/routing/navigation/components/WorkspaceEntityCrossLinks';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/search._index';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => _match?.loaderData?.query ?? 'Search',
  links: (_match) => [{ children: 'Search', to: '/search' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.request.url ? new URL(args.request.url) : null;
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const { expandRankingDetails, limit, page, q } =
    parseSearchParams(searchParams);
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

  // Setup — utils: parseSearchParams for pre-fill; config: DEFAULT_SEARCH_LIMIT for pagination
  const currentQ = q ?? searchParams.get('q') ?? '';
  const expandRankingDetails =
    expandRankingFromLoader ||
    (searchParams.get('details') ?? '') === 'ranking';

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

  return (
    <GlobalScreen>
      <h1 className="text-xl my-4 text-highlight">Search</h1>

      {!currentQ ? (
        <div className="mb-6 space-y-3">
          <WorkspaceEntityCrossLinks label="Jump to a workspace area" />
          <p className="max-w-2xl text-muted-foreground">
            Enter a query below for semantic search across embedded plans,
            tasks, and documentation. Results are ranked by embedding
            similarity—open{' '}
            <strong className="font-medium text-foreground">
              Why this result?
            </strong>{' '}
            on any hit for scores and ids, or use power-user mode after you run
            a search to expand ranking details on every card.
          </p>
        </div>
      ) : null}

      {currentQ ? (
        <div className="text-muted-foreground text-sm max-w-2xl mb-2 space-y-2">
          <p>
            Semantic search over embedded plan, task, and documentation chunks.
            Open “Why this result?” on a card to see ranking notes, similarity,
            and entity ids. Enable power-user mode below to expand every card’s
            ranking section and add result position labels.
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-foreground">
            <input
              aria-label="Expand ranking details on all results"
              checked={expandRankingDetails}
              className="rounded border-input"
              onChange={handleExpandRankingChange}
              type="checkbox"
            />
            <span>
              Power user: expand ranking details (sets{' '}
              <code className="rounded bg-muted px-1 text-[11px]">
                details=ranking
              </code>{' '}
              in the URL; preserved when paging)
            </span>
          </label>
        </div>
      ) : null}

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

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
