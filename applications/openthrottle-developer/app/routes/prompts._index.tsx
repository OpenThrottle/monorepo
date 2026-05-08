import * as React from 'react';
import { useSearchParams } from 'react-router';
import {
  DEFAULT_PAGINATION_LIMIT,
  DEFAULT_PAGINATION_PAGE,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import {
  OpenThrottlePagination,
  OpenThrottleStatCard,
} from '@openthrottle/react-router-ui';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { CustomPromptType, GetPromptsDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { AgentsSectionQuickLinks } from '~/routing/agents/components/AgentsSectionQuickLinks';
import { PromptToolbar } from '~/routing/prompts/components/PromptToolbar';
import { PromptCard } from '~/routing/prompts/components/PromptCard';
import {
  parsePromptsSortFromSearchParams,
  parsePromptsTypesFromSearchParams,
} from '~/routing/prompts/utils/parsers';
import type { Route } from '@/app/routes/+types/prompts._index';
import { PromptsEmpty } from '~/routing/prompts/components/PromptsEmpty';
import { PromptsIntroduction } from '~/routing/prompts/components/PromptsIntroduction';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Prompts',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.request.url ? new URL(args.request.url) : null;

  const searchParams = url?.searchParams ?? new URLSearchParams();
  const types = parsePromptsTypesFromSearchParams(searchParams);
  const pageRaw = url?.searchParams.get('page');

  const page = Math.max(
    DEFAULT_PAGINATION_PAGE,
    Number.isFinite(Number(pageRaw))
      ? Number(pageRaw)
      : DEFAULT_PAGINATION_PAGE,
  );

  const limitRaw = url?.searchParams.get('limit');
  const limitParsed =
    limitRaw != null && limitRaw !== '' ? Number(limitRaw) : NaN;

  const limit = Math.max(
    1,
    Number.isFinite(limitParsed) && limitParsed >= 1
      ? limitParsed
      : DEFAULT_PAGINATION_LIMIT,
  );

  const q = searchParams.get('q')?.trim() ?? null;
  const search = q && q.length > 0 ? q : null;

  const promptType = types.length === 1 ? (types[0] as CustomPromptType) : null;
  const result = await executeGraphqlWithAuth(
    args.request,
    GetPromptsDocument,
    { input: { promptType, search } },
  );

  let prompts = result.customPrompts ?? [];

  if (types.length > 1) {
    prompts = prompts.filter((p) => types.includes(p.promptType));
  }

  const total = prompts.length;
  const countAgents = prompts.filter(
    (p) => p.promptType === CustomPromptType.Agents,
  ).length;
  const countSkills = prompts.filter(
    (p) => p.promptType === CustomPromptType.Skills,
  ).length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPrompts = prompts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(total / limit);

  return {
    countAgents,
    countSkills,
    limit,
    page,
    prompts: paginatedPrompts,
    total,
    totalPages,
    types,
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Prompts | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const {
    countAgents,
    countSkills,
    limit,
    page,
    prompts,
    total,
    // totalPages,
    types,
  } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const { sortBy, sortOrder } = parsePromptsSortFromSearchParams(searchParams);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="grid md:grid-cols-3 gap-4 lg:gap-8">
        <OpenThrottleStatCard title="Agents-type prompts" value={countAgents} />
        <OpenThrottleStatCard title="Skills-type prompts" value={countSkills} />
        <OpenThrottleStatCard title="Total (this list)" value={total} />
      </div>
      <PromptsIntroduction />
      <AgentsSectionQuickLinks />

      <PromptToolbar
        limit={limit}
        page={page}
        sortBy={sortBy}
        sortOrder={sortOrder}
        types={types}
      />

      {prompts.length > 0 ? (
        <>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
            data-testid="prompts-grid"
          >
            {prompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
          <OpenThrottlePagination limit={limit} page={page} total={total} />
        </>
      ) : (
        <PromptsEmpty />
      )}
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
