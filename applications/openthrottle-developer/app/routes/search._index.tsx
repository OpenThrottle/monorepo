import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { redirect, useSearchParams } from 'react-router';

import type { Route } from '@/app/routes/+types/search._index';
import type { SearchChunk } from '~/__generated__/graphql';
import { GetSearchResultsDocument } from '~/__generated__/graphql';
import { GlobalSemanticSearchOffNotice } from '~/global/components/GlobalSemanticSearchOffNotice';
import { SITE_TITLE } from '~/global/config/settings';
import { SearchCard } from '~/routing/search/components/SearchCard';
import { SearchIntroduction } from '~/routing/search/components/SearchIntroduction';
import { SearchResultPreview } from '~/routing/search/components/SearchResultPreview';
import { SearchToolbar } from '~/routing/search/components/SearchToolbar';
import {
  DEFAULT_SEARCH_LIMIT,
  SEARCH_LIMIT_OPTIONS,
} from '~/routing/search/config';
import { SEARCH_PAGINATION_COPY } from '~/routing/search/data/copy';
import {
  buildSearchUrl,
  parseSearchParams,
} from '~/routing/search/utils/parsers';

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
      results: { chunks: [], reason: null },
      total: 0,
    };
  }

  const { search } = await executeGraphqlWithAuth(
    args.request,
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

  return {
    expandRankingDetails,
    limit,
    page,
    query: q,
    results: { chunks: search.chunks, reason: search.reason ?? null },
    total: search.total,
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
  const [searchParams] = useSearchParams();
  const [previewResult, setPreviewResult] = React.useState<SearchChunk | null>(
    null,
  );
  const previewTriggerRef = React.useRef<HTMLElement | null>(null);

  // Setup
  const currentQ = q ?? searchParams.get('q') ?? '';
  const expandRankingDetails =
    expandRankingFromLoader ||
    (searchParams.get('details') ?? '') === 'ranking';
  const pageSize = pageLimit ?? DEFAULT_SEARCH_LIMIT;
  const previewIndex = results.chunks.findIndex((chunk) => {
    return chunk.id === previewResult?.id;
  });
  const isPreviewOnPage = previewIndex >= 0;
  const previewRankMeta = isPreviewOnPage
    ? { indexOnPage: previewIndex, page, pageSize, total }
    : undefined;

  // Handlers
  const handlePreview = (result: SearchChunk, trigger: HTMLElement): void => {
    previewTriggerRef.current = trigger;
    setPreviewResult(result);
  };

  const handleClosePreview = (): void => {
    setPreviewResult(null);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      {/* One stack: GlobalScreen's own gap between children is far too loose for a result list. */}
      <div className="flex flex-col gap-4">
        <div className="space-y-3">
          <SearchIntroduction hasQuery={currentQ !== ''} />
          <SearchToolbar
            defaultQuery={currentQ}
            expandRankingDetails={expandRankingDetails}
          />
        </div>
        <GlobalSemanticSearchOffNotice reason={results.reason} />
        <div className="flex flex-col gap-2">
          {results.chunks.map((result) => {
            return (
              <SearchCard
                key={result.id}
                onPreview={handlePreview}
                result={result}
              />
            );
          })}
        </div>
        <SearchResultPreview
          defaultOpenWhy={expandRankingDetails}
          onClose={handleClosePreview}
          rankMeta={previewRankMeta}
          result={previewResult}
          returnFocusTo={previewTriggerRef.current}
        />
        <OpenThrottlePagination
          basePath="/search"
          className="mt-2"
          details={expandRankingDetails ? 'ranking' : undefined}
          limit={pageSize}
          page={page}
          pageSize={{
            label: SEARCH_PAGINATION_COPY.pageSizeLabel,
            options: SEARCH_LIMIT_OPTIONS,
          }}
          resultLabel={SEARCH_PAGINATION_COPY.resultLabel}
          search={currentQ || undefined}
          total={total}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
