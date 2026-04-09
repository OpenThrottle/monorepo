import * as React from 'react';
import { useSearchParams } from 'react-router';
import {
  DEFAULT_PAGINATION_LIMIT,
  DEFAULT_PAGINATION_PAGE,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GetPromptsDocument,
  type CustomPromptType,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { PromptToolbar } from '~/routing/prompts/components/PromptToolbar';
import { PromptCard } from '~/routing/prompts/components/PromptCard';
import {
  parsePromptsSortFromSearchParams,
  parsePromptsTypesFromSearchParams,
} from '~/routing/prompts/utils/parsers';
import type { Route } from '@/app/routes/+types/prompts._index';

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
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPrompts = prompts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(total / limit);

  return {
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
  const { limit, page, prompts, total, totalPages, types } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const { sortBy, sortOrder } = parsePromptsSortFromSearchParams(searchParams);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="gap-8 p-4 md:px-8 relative flex flex-col max-w-7xl mx-auto w-full">
      <PromptToolbar
        className="my-4"
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

          {totalPages > 1 ? (
            <OpenThrottlePagination limit={limit} page={page} total={total} />
          ) : null}
        </>
      ) : (
        <div className="flex flex-col flex-1 justify-center">
          <div
            className="text-center py-12 text-muted-foreground"
            data-testid="prompts-empty"
          >
            <p className="text-lg">No prompts found.</p>
            <p className="mt-2">Create your first prompt to get started.</p>
          </div>
        </div>
      )}
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
