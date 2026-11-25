import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
  GlobalStatsPanel,
  ROUTE_STATS_URL,
  shouldRevalidateIgnoringParams,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { useSearchParams } from 'react-router';

import type { Route } from '@/app/routes/+types/search._index';
import { SITE_TITLE } from '~/global/config/settings';
import { SearchCodeRepositoryPicker } from '~/routing/search/components/SearchCodeRepositoryPicker';
import { SearchCodeResults } from '~/routing/search/components/SearchCodeResults';
import { SearchIntroduction } from '~/routing/search/components/SearchIntroduction';
import { SearchKnowledgeResults } from '~/routing/search/components/SearchKnowledgeResults';
import { SearchScopeToggle } from '~/routing/search/components/SearchScopeToggle';
import { SearchStats } from '~/routing/search/components/SearchStats';
import { SearchToolbar } from '~/routing/search/components/SearchToolbar';
import { SEARCH_SCOPE } from '~/routing/search/config';
import { loadSearchIndex } from '~/routing/search/utils/loadSearchIndex.server';

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
  return loadSearchIndex(args.request, args.url);
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
  const { expandRankingDetails: expandRankingFromLoader, query: q } =
    loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const currentQ = q ?? searchParams.get('q') ?? '';
  const expandRankingDetails =
    expandRankingFromLoader ||
    (searchParams.get('details') ?? '') === 'ranking';
  const isCode = loaderData.scope === SEARCH_SCOPE.code;
  const repository = isCode ? loaderData.code.repository : null;
  const repositories = isCode ? loaderData.code.repositories : [];
  const hasRepositoryChoice = repository !== null && repositories.length > 1;

  // Handlers

  // Markup
  const repositoryPicker = hasRepositoryChoice && (
    <SearchCodeRepositoryPicker
      query={currentQ}
      repositories={repositories}
      selected={repository}
    />
  );
  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {repositoryPicker}
      <SearchScopeToggle query={currentQ} scope={loaderData.scope} />
    </div>
  );
  const knowledgeResults = loaderData.scope === SEARCH_SCOPE.knowledge && (
    <SearchKnowledgeResults
      data={loaderData}
      expandRankingDetails={expandRankingDetails}
      query={currentQ}
    />
  );
  const codeResults = loaderData.scope === SEARCH_SCOPE.code && (
    <SearchCodeResults data={loaderData} query={currentQ} />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <SearchIntroduction actions={headerActions} />
      <GlobalStatsPanel>
        <SearchStats view={loaderData.stats} />
      </GlobalStatsPanel>
      {/* One stack: GlobalScreen's own gap between children is far too loose for a result list. */}
      <div className="flex flex-col gap-4">
        <SearchToolbar
          defaultQuery={currentQ}
          expandRankingDetails={expandRankingDetails}
          repositoryId={repository?.id ?? null}
          scope={loaderData.scope}
        />
        {knowledgeResults}
        {codeResults}
      </div>
    </GlobalScreen>
  );
}

export const shouldRevalidate = shouldRevalidateIgnoringParams([
  ROUTE_STATS_URL.param,
]);

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
