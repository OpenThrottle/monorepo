import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/usage._index';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import { GetUsageDailyStatsDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { DashboardDailyStatsCard } from '~/routing/dashboard/components/DashboardDailyStatsCard';
import { UsageAnalyticsGaps } from '~/routing/usage/components/UsageAnalyticsGaps';
import { UsageDailyActivityOverview } from '~/routing/usage/components/UsageDailyActivityOverview';
import { UsageIntroduction } from '~/routing/usage/components/UsageIntroduction';
import { UsageOverview } from '~/routing/usage/components/UsageOverview';
import { UsageSnapshot } from '~/routing/usage/components/UsageSnapshot';
import { getUsageRange } from '~/routing/usage/utils/getUsageRange';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Usage',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { endIso, rangeDays, startIso } = getUsageRange();

  const dailyResult = await executeGraphqlWithAuth(
    args.request,
    GetUsageDailyStatsDocument,
    {
      end: endIso,
      start: startIso,
    },
  );

  const dailyStats: DashboardDailyStatsCardFragment[] =
    dailyResult.dailyStatsRange.items ?? [];

  return {
    dailyStats,
    rangeDays,
    rangeEndIso: endIso,
    rangeStartIso: startIso,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Usage | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { dailyStats, rangeDays, rangeEndIso, rangeStartIso } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <UsageIntroduction rangeDays={rangeDays} />
      <UsageOverview rangeDays={rangeDays} />
      <div data-testid="UsageDailyActivity">
        <DashboardDailyStatsCard className="my-4" dailyStats={dailyStats} />
      </div>
      <UsageDailyActivityOverview rangeDays={rangeDays} />
      <UsageAnalyticsGaps />
      <UsageSnapshot
        dailyStats={dailyStats}
        rangeDays={rangeDays}
        rangeEndIso={rangeEndIso}
        rangeStartIso={rangeStartIso}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
