import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import {
  GlobalErrorBoundary,
  GlobalFeatureOnboarding,
  GlobalFeatureOnboardingModal,
  GlobalScreen,
  GlobalStatsPanel,
  ROUTE_STATS_URL,
  shouldRevalidateIgnoringParams,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import type { RouteMatch } from 'react-router';
import { useSearchParams } from 'react-router';

import type { Route } from '@/app/routes/+types/plans._index';
import { SITE_TITLE } from '~/global/config/settings';
import { PlansIntroduction } from '~/routing/plans/components/PlansIntroduction';
import { PlansStats } from '~/routing/plans/components/PlansStats';
import { PlansTable } from '~/routing/plans/components/PlansTable';
import { PlansToolbar } from '~/routing/plans/components/PlansToolbar';
import { PLANS_ONBOARDING } from '~/routing/plans/data/copy';
import { usePlansIndexRevalidation } from '~/routing/plans/hooks/usePlansIndexRevalidation';
import { loadPlansIndex } from '~/routing/plans/utils/loadPlansIndex.server';
import {
  buildStatusFilterUrls,
  hasActivePlansFilters,
  parsePlansSortFromSearch,
} from '~/routing/plans/utils/parsers';

export const handle = {
  breadcrumb: () => 'Plans',
  links: (_match: RouteMatch) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  return loadPlansIndex(args.request, args.url);
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
  } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();
  const { sortBy, sortOrder } = React.useMemo(
    () => parsePlansSortFromSearch(searchParams),
    [searchParams],
  );
  const statusFilterUrls = React.useMemo(
    () => buildStatusFilterUrls(searchParams),
    [searchParams],
  );
  // Refresh the list when any plan or task changes status, from any writer.
  usePlansIndexRevalidation();

  // Setup
  const isCard = searchParams.get('view') === 'card';
  const view: 'card' | 'table' = isCard ? 'card' : 'table';

  const countByStatus = (status: string): number => {
    return (
      statusCounts.find((s) => s.status.toUpperCase() === status)?.count ?? 0
    );
  };

  // New user: zero plans workspace-wide and no active filter — show onboarding
  // instead of the toolbar/table/pagination. Filtered no-results falls through
  // to PlansTable -> PlanTasksEmpty (clear-filters CTA).
  const isNewUser = totalCountAll === 0 && !hasActivePlansFilters(searchParams);

  // Handlers

  // Markup
  const onboarding = <GlobalFeatureOnboarding content={PLANS_ONBOARDING} />;
  const plansListing = (
    <>
      <GlobalStatsPanel>
        <PlansStats
          countCompleted={countByStatus('COMPLETED')}
          countInProgress={countByStatus('IN_PROGRESS')}
          totalCount={totalCount}
          totalCountAll={totalCountAll}
          totalCountQueued={countByStatus('QUEUED')}
        />
      </GlobalStatsPanel>
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
        <PlansTable plans={plans} statusFilterUrls={statusFilterUrls} />
      </div>
      <OpenThrottlePagination
        basePath="/plans"
        className="mt-8"
        limit={limit}
        page={page}
        // Sort (`sortBy`/`sortOrder`) and `view` live only in the URL here, so
        // clone the live query string rather than rebuilding it from extras.
        preserveSearchParams={true}
        resultLabel="plans"
        total={totalCount}
      />
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <GlobalFeatureOnboardingModal content={PLANS_ONBOARDING} />
      <PlansIntroduction />
      {isNewUser ? onboarding : plansListing}
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
