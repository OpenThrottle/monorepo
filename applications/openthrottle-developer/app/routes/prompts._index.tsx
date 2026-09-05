import * as React from 'react';
import { CustomPromptType, GetPromptsDocument } from '~/__generated__/graphql';
import {
  mergeRouteModuleMeta,
  parsePagination,
} from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalFeatureOnboarding,
  GlobalFeatureOnboardingModal,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import {
  parsePromptsSortFromSearchParams,
  parsePromptsTypesFromSearchParams,
} from '~/routing/prompts/utils/parsers';
import { isCustomPromptType } from '~/routing/prompts/utils/prompt-type-guards';
import { PromptsIntroduction } from '~/routing/prompts/components/PromptsIntroduction';
import { PromptsStats } from '~/routing/prompts/components/PromptsStats';
import { PromptToolbar } from '~/routing/prompts/components/PromptToolbar';
import { PromptsTable } from '~/routing/prompts/components/PromptsTable';
import { PROMPTS_ONBOARDING } from '~/routing/prompts/data/data.copy';
import { SITE_TITLE } from '~/global/config/settings';
import { useSearchParams } from 'react-router';
import type { Route } from '@/app/routes/+types/prompts._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Prompts',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;

  const searchParams = url?.searchParams ?? new URLSearchParams();
  const types = parsePromptsTypesFromSearchParams(searchParams);
  const { limit, offset, page } = parsePagination(searchParams);

  const q = searchParams.get('q')?.trim() ?? null;
  const search = q && q.length > 0 ? q : null;

  const firstType = types.length === 1 ? types[0] : undefined;
  const promptType =
    firstType != null && isCustomPromptType(firstType) ? firstType : null;
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
  const paginatedPrompts = prompts.slice(offset, offset + limit);
  const totalPages = Math.ceil(total / limit);

  return {
    countAgents,
    countSkills,
    limit,
    page,
    prompts: paginatedPrompts,
    search,
    total,
    totalPages,
    types,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
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
    search,
    total,
    types,
  } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const showStats = false;
  const { sortBy, sortOrder } = parsePromptsSortFromSearchParams(searchParams);
  const isFiltered = (search != null && search.length > 0) || types.length > 0;
  // A genuinely-new user has zero prompts and no active filter — show the rich
  // onboarding pitch instead of the toolbar/table. A zero-result *filtered*
  // search still falls through to PromptsTable -> PromptsEmpty (clear-filters CTA).
  const isNewUser = total === 0 && !isFiltered;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <GlobalScreen beta={true}>
        {showStats && (
          <PromptsStats
            countAgents={countAgents}
            countSkills={countSkills}
            total={total}
          />
        )}
        <PromptsIntroduction />

        {isNewUser ? (
          <GlobalFeatureOnboarding content={PROMPTS_ONBOARDING} />
        ) : (
          <div className="flex flex-col gap-4">
            <PromptToolbar
              limit={limit}
              page={page}
              sortBy={sortBy}
              sortOrder={sortOrder}
              types={types}
            />
            <PromptsTable
              // className="bg-card"
              prompts={prompts ?? []}
              search={search ?? undefined}
            />
            <OpenThrottlePagination
              basePath="/prompts"
              className="mt-8"
              limit={limit}
              page={page}
              resultLabel="prompts"
              search={search ?? undefined}
              sortBy={sortBy}
              sortOrder={sortOrder}
              total={total}
            />
          </div>
        )}
      </GlobalScreen>

      <GlobalFeatureOnboardingModal content={PROMPTS_ONBOARDING} />
    </>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
