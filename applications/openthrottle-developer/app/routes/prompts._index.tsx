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
import type { Route } from '@/app/routes/+types/prompts._index';
import {
  parseSortFromSearchParams as parsePromptsSortFromSearch,
  parseTypesFromSearchParams,
} from '~/routing/prompts/utils/parsers';

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.request.url ? new URL(args.request.url) : null;

  const searchParams = url?.searchParams ?? new URLSearchParams();
  const types = parseTypesFromSearchParams(searchParams);
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

  const result = await executeGraphqlWithAuth(
    args.request,
    GetPromptsDocument,
    {
      input: {
        promptType: types.length === 1 ? (types[0] as CustomPromptType) : null,
        search,
      },
    },
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

export default function Index(props: Route.ComponentProps) {
  const { loaderData } = props;
  const { limit, page, prompts, total, totalPages, types } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const { sortBy, sortOrder } = parsePromptsSortFromSearch(searchParams);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="p-6 relative h-full" data-testid="prompts-index">
      <h1 className="text-xl font-bold my-4">Prompts</h1>
      <p className="text-muted-foreground mb-6">
        Manage your AI workflow documents including agents, commands, prompts,
        rules, and skills.
      </p>

      <PromptToolbar
        className="mb-6"
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
        <div
          className="text-center py-12 text-muted-foreground"
          data-testid="prompts-empty"
        >
          <p className="text-lg">No prompts found.</p>
          <p className="mt-2">Create your first prompt to get started.</p>
        </div>
      )}
    </main>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
