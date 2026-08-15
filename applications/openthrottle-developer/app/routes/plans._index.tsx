import * as React from 'react';
import { RouteMatch, useSearchParams } from 'react-router';
import {
  DEFAULT_PAGINATION_LIMIT,
  DEFAULT_PAGINATION_PAGE,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalFeatureOnboarding,
  GlobalScreen,
  readSearchParam,
} from '@openthrottle/react-router-ui-global';
import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import {
  GetPlanAssigneeOptionsDocument,
  GetPlanCountsByStatusDocument,
  GetPlansByStatusDocument,
} from '~/__generated__/graphql';
import {
  buildStatusFilterUrls,
  hasActivePlansFilters,
  parseAssigneesFromSearchParams,
  parsePlansSortFromSearch,
} from '~/routing/plans/utils/parsers';
import { parseStatusesFromSearchParams } from '~/routing/plans/config/status-options';
import { PlansIntroduction } from '~/routing/plans/components/PlansIntroduction';
import { PlansStats } from '~/routing/plans/components/PlansStats';
import { PLANS_ONBOARDING } from '~/routing/plans/data/data.copy';
import { PlansTable } from '~/routing/plans/components/PlansTable';
import { PlansToolbar } from '~/routing/plans/components/PlansToolbar';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/plans._index';

export const handle = {
  breadcrumb: () => 'Plans',
  links: (_match: RouteMatch) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;

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
  const q = readSearchParam(searchParams);
  const titleSubstring = q.length > 0 ? q : null;

  const [result, statusCountsResult, assigneeOptionsResult] = await Promise.all(
    [
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
      executeGraphqlWithAuth(
        args.request,
        GetPlanAssigneeOptionsDocument,
      ).catch(() => null),
    ],
  );

  const assigneeOptions: string[] =
    assigneeOptionsResult?.listDistinctAuthorsAndAssignees ?? [];

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

export const links: Route.LinksFunction = () => {
  return [];
};

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
  const countByStatus = (status: string): number =>
    statusCounts.find((s) => s.status === status)?.count ?? 0;

  const isCard = searchParams.get('view') === 'card';

  const countInProgress = countByStatus('IN_PROGRESS');
  const countCompleted = countByStatus('COMPLETED');

  const view: 'card' | 'table' = isCard ? 'card' : 'table';

  // New user: zero plans workspace-wide and no active filter — show onboarding
  // instead of the toolbar/table/pagination. Filtered no-results falls through
  // to PlansTable -> PlanTasksEmpty (clear-filters CTA).
  const isNewUser = totalCountAll === 0 && !hasActivePlansFilters(searchParams);

  // Handlers

  // Markup

  // Life Cycle
  const { sortBy, sortOrder } = React.useMemo(
    () => parsePlansSortFromSearch(searchParams),
    [searchParams],
  );

  const statusFilterUrls = React.useMemo(
    () => buildStatusFilterUrls(searchParams),
    [searchParams],
  );

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <PlansIntroduction />
      <PlansStats
        countCompleted={countCompleted}
        countInProgress={countInProgress}
        totalCount={totalCount}
        totalCountAll={totalCountAll}
        totalCountQueued={totalCountQueued}
      />
      {isNewUser ? (
        <GlobalFeatureOnboarding content={PLANS_ONBOARDING} />
      ) : (
        <>
          <div className="flex flex-col gap-4">
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
            <PlansTable
              className="bg-card"
              plans={plans}
              statusFilterUrls={statusFilterUrls}
            />
          </div>
          <OpenThrottlePagination
            assignees={assignees}
            basePath="/plans"
            className="mt-8"
            limit={limit}
            page={page}
            statuses={statuses}
            total={totalCount}
          />
        </>
      )}
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
