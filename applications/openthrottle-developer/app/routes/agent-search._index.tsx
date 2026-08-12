import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { useSearchParams } from 'react-router';
import { SearchAgentAssetsDocument } from '~/__generated__/graphql';
import { AGENT_SEARCH_LIMIT } from '~/routing/agent-search/config';
import { AgentAssetCard } from '~/routing/agent-search/components/AgentAssetCard';
import { AgentSearchEmpty } from '~/routing/agent-search/components/AgentSearchEmpty';
import { AgentSearchForm } from '~/routing/agent-search/components/AgentSearchForm';
import { AgentSearchIntroduction } from '~/routing/agent-search/components/AgentSearchIntroduction';
import { AgentSearchTabs } from '~/routing/agent-search/components/AgentSearchTabs';
import { AGENT_SEARCH_COPY } from '~/routing/agent-search/data/data.copy';
import { EMPTY_COUNTS } from '~/routing/agent-search/data/empty-counts';
import {
  GQL_TO_PROMPT_TYPE,
  PROMPT_TYPE_TO_GQL,
} from '~/routing/agent-search/data/prompt-type-maps';
import {
  AGENT_ASSET_PROMPT_TYPES,
  type AgentAssetResult,
  type AgentSearchCounts,
} from '~/routing/agent-search/types';
import { parseAgentSearchParams } from '~/routing/agent-search/utils/parsers';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/agent-search._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => {
    const query = match.loaderData?.query ?? '';
    return query === '' ? 'Agent search' : query;
  },
  links: (match) => {
    const query = match.loaderData?.query ?? '';
    if (query === '') return [];
    return [{ children: 'Agent search', to: '/agent-search' }];
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const { projectId, q, tab } = parseAgentSearchParams(searchParams);
  const trimmed = q.trim();

  if (trimmed === '') {
    return {
      counts: EMPTY_COUNTS,
      projectId,
      query: q,
      results: [],
      tab,
      usedDiskFallback: false,
    };
  }

  const { searchAgentAssets } = await executeGraphqlWithAuth(
    args.request,
    SearchAgentAssetsDocument,
    {
      input: {
        limit: AGENT_SEARCH_LIMIT,
        projectId,
        promptTypes: AGENT_ASSET_PROMPT_TYPES.map((t) => PROMPT_TYPE_TO_GQL[t]),
        query: trimmed,
      },
    },
  );

  let results: AgentAssetResult[] = searchAgentAssets.chunks.map((chunk) => ({
    content: chunk.content,
    customPromptId: chunk.customPromptId,
    description: chunk.description ?? null,
    filePath: chunk.filePath ?? null,
    id: chunk.id,
    labels: chunk.labels,
    promptType: GQL_TO_PROMPT_TYPE[chunk.promptType] ?? 'skills',
    similarity: chunk.similarity,
    source: 'db',
    title: chunk.title,
  }));

  let usedDiskFallback = false;
  if (results.length === 0) {
    const { diskFallbackSearch } =
      await import('~/routing/agent-search/data/disk-fallback.server');
    const { getMonorepoRoot } =
      await import('~/routing/agents/data/resolve-monorepo-root.server');

    results = diskFallbackSearch(
      trimmed,
      [...AGENT_ASSET_PROMPT_TYPES],
      AGENT_SEARCH_LIMIT,
      getMonorepoRoot(),
    );
    usedDiskFallback = results.length > 0;
  }

  const counts: AgentSearchCounts = {
    all: results.length,
    personas: results.filter((r) => r.promptType === 'personas').length,
    rules: results.filter((r) => r.promptType === 'rules').length,
    skills: results.filter((r) => r.promptType === 'skills').length,
  };

  const visible =
    tab === 'all' ? results : results.filter((r) => r.promptType === tab);

  return {
    counts,
    projectId,
    query: q,
    results: visible,
    tab,
    usedDiskFallback,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Agent search | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { counts, projectId, query, results, tab, usedDiskFallback } =
    loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const currentQ = query ?? searchParams.get('q') ?? '';
  const showEmpty = currentQ !== '' && results.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <AgentSearchIntroduction />
      <AgentSearchForm
        defaultQuery={currentQ}
        projectId={projectId}
        tab={tab}
      />
      <AgentSearchTabs counts={counts} tab={tab} />
      {usedDiskFallback ? (
        <p
          className="text-muted-foreground px-4 text-xs"
          data-testid="AgentSearch-diskNotice"
        >
          {AGENT_SEARCH_COPY.diskFallbackNotice}
        </p>
      ) : null}
      <div className="flex flex-col gap-4 p-4">
        {showEmpty ? (
          <AgentSearchEmpty />
        ) : (
          results.map((result) => (
            <AgentAssetCard
              className="bg-card"
              key={result.id}
              result={result}
            />
          ))
        )}
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
