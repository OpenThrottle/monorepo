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
import type { Route } from '@/app/routes/+types/plans._index';
import {
  PLAN_STATUS_FILTER_OPTIONS,
  parseStatusesFromSearchParams,
} from '~/routing/plans/config/status-options';
import { parsePlansSortFromSearch } from '~/routing/plans/utils/parsers';
import { PlansTable } from '~/routing/plans/components/PlansTable';
import { PlansToolbar } from '~/routing/plans/components/PlansToolbar';

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
  };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Plans | ${SITE_TITLE}` }];
});

export default function Index(props: Route.ComponentProps) {
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
  } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  const countByStatus = (status: string): number =>
    statusCounts.find((s) => s.status === status)?.count ?? 0;

  const inProgressCount = countByStatus('IN_PROGRESS');
  const completedCount = countByStatus('COMPLETED');

  // Setup
  const { sortBy, sortOrder } = React.useMemo(
    () => parsePlansSortFromSearch(searchParams),
    [searchParams],
  );

  const view = (searchParams.get('view') === 'card' ? 'card' : 'table') as
    | 'table'
    | 'card';

  // Handlers

  // Markup

  // Life Cycle
  const statusFilterUrls = React.useMemo(() => {
    return Object.fromEntries(
      PLAN_STATUS_FILTER_OPTIONS.map((opt) => {
        const p = new URLSearchParams(searchParams);
        p.delete('status');
        p.append('status', opt.value);
        p.set('page', '1');
        return [opt.value, `/plans?${p.toString()}`] as const;
      }),
    );
  }, [searchParams]);

  // 🔌 Short Circuit

  return (
    <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
      <div className="grid md:grid-cols-3 gap-4 lg:gap-8">
        <OpenThrottleStatCard title="Total" value={totalCount} />
        <OpenThrottleStatCard
          title="In progress (all)"
          value={inProgressCount}
        />
        <OpenThrottleStatCard title="Completed (all)" value={completedCount} />
      </div>

      <h1 className="text-xl mb-2 mt-12 text-highlight">Plans</h1>
      <PlansToolbar
        assigneeOptions={assigneeOptions}
        assignees={assignees}
        className="mb-4"
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
