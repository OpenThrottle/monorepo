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
  GetPlanAssigneeOptionsDocument,
  GetPlanCountsByStatusDocument,
  GetPlansByStatusDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import {
  PLAN_STATUS_FILTER_OPTIONS,
  parseStatusesFromSearchParams,
} from '~/routing/plans/config/status-options';
import { parsePlansSortFromSearch } from '~/routing/plans/utils/parsers';
import { PlansTable } from '~/routing/plans/components/PlansTable';
import { PlansToolbar } from '~/routing/plans/components/PlansToolbar';
import type { Route } from '@/app/routes/+types/plans._index';

/** Parse multiple assignee values from URL (repeated params or comma-separated). */
function parseAssigneesFromSearchParams(
  searchParams: URLSearchParams,
): string[] {
  const raw = searchParams.getAll('assignee').flatMap((a) => a.split(','));
  return raw.map((a) => a.trim()).filter(Boolean);
}

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.request.url ? new URL(args.request.url) : null;

  const searchParams = url?.searchParams ?? new URLSearchParams();
  const statuses = parseStatusesFromSearchParams(searchParams);
  const assignees = parseAssigneesFromSearchParams(searchParams);
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

  const offset = (page - 1) * limit;
  const q = searchParams.get('q')?.trim() ?? null;
  const titleSubstring = q && q.length > 0 ? q : null;

  let assigneeOptions: string[] = [];

  const assigneeOptionsResult = await executeGraphqlWithAuth(
    args.request,
    GetPlanAssigneeOptionsDocument,
  ).catch(() => null);

  if (assigneeOptionsResult != null) {
    assigneeOptions = assigneeOptionsResult.listDistinctAuthorsAndAssignees;
  }

  const [result, statusCountsResult] = await Promise.all([
    executeGraphqlWithAuth(args.request, GetPlansByStatusDocument, {
      input: {
        assignees: assignees.length > 0 ? assignees : null,
        limit,
        offset,
        statuses: statuses.length > 0 ? statuses : null,
        titleSubstring,
      },
    }),
    executeGraphqlWithAuth(args.request, GetPlanCountsByStatusDocument).catch(
      () => null,
    ),
  ]);

  const statusCounts = statusCountsResult?.planCountsByStatus ?? [];

  return {
    assigneeOptions,
    assignees,
    limit,
    page,
    plans: result.listPlansByStatus.plans,
    statusCounts,
    statuses,
    totalCount: result.listPlansByStatus.totalCount,
    totalCountAll: result.allPlansCount.totalCount,
    totalCountQueued: result.queuedPlansCount.totalCount,
  };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Plans | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const {
    assigneeOptions,
    assignees,
    limit,
    page,
    plans,
    statusCounts,
    statuses,
    totalCount,
    totalCountAll,
    totalCountQueued,
  } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const isCard = searchParams.get('view') === 'card';

  const countByStatus = (status: string): number =>
    statusCounts.find((s) => s.status === status)?.count ?? 0;

  const countInProgress = countByStatus('IN_PROGRESS');
  const countCompleted = countByStatus('COMPLETED');

  const view = (isCard ? 'card' : 'table') as 'card' | 'table';

  // Handlers

  // Markup

  // Life Cycle
  const { sortBy, sortOrder } = React.useMemo(
    () => parsePlansSortFromSearch(searchParams),
    [searchParams],
  );

  const statusFilterUrls = React.useMemo(() => {
    return Object.fromEntries(
      PLAN_STATUS_FILTER_OPTIONS.map((option) => {
        const params = new URLSearchParams(searchParams);

        params.delete('status');
        params.append('status', option.value);
        params.set('page', '1');

        return [option.value, `/plans?${params.toString()}`] as const;
      }),
    );
  }, [searchParams]);

  // 🔌 Short Circuit

  return (
    <main className="gap-8 p-4 md:px-8 relative flex flex-col">
      <div className="grid md:grid-cols-3 gap-4 lg:gap-8 mt-4">
        <OpenThrottleStatCard
          color="bg-yellow-300"
          subValue={totalCountQueued}
          title="In progress / Queued"
          value={countInProgress}
        />
        <OpenThrottleStatCard
          color="bg-green-300"
          subValue={totalCountAll}
          title="Matching / Total plans"
          value={totalCount}
        />
        <OpenThrottleStatCard
          color="bg-green-300"
          title="Completed (all)"
          value={countCompleted}
        />
      </div>

      <PlansToolbar
        assigneeOptions={assigneeOptions}
        assignees={assignees}
        limit={limit}
        page={page}
        sortBy={sortBy}
        sortOrder={sortOrder}
        statuses={statuses}
        view={view}
      />
      <PlansTable plans={plans} statusFilterUrls={statusFilterUrls} />
      <OpenThrottlePagination
        assignees={assignees}
        basePath="/plans"
        className="mt-8"
        limit={limit}
        page={page}
        statuses={statuses}
        total={totalCount}
      />
    </main>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
