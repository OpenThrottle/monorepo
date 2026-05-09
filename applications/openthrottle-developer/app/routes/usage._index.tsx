import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GetUsageDailyStatsDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { UsageDailyActivity } from '~/routing/usage/components/UsageDailyActivity';
import { UsageIntroduction } from '~/routing/usage/components/UsageIntroduction';
import { UsageOverview } from '~/routing/usage/components/UsageOverview';
import { UsageSnapshot } from '~/routing/usage/components/UsageSnapshot';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/usage._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Usage',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const end = new Date();
  const endIso = end.toISOString();

  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();

  const result = await executeGraphqlWithAuth(
    args.request,
    GetUsageDailyStatsDocument,
    { end: endIso, start: startIso },
  );

  const dailyStats = result.dailyStatsRange.items ?? [];

  return {
    dailyStats: dailyStats as DashboardDailyStatsCardFragment[],
    rangeDays: 30,
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
      <UsageDailyActivity dailyStats={dailyStats} rangeDays={rangeDays} />
      <UsageSnapshot
        dailyStats={dailyStats}
        rangeDays={rangeDays}
        rangeEndIso={rangeEndIso}
        rangeStartIso={rangeStartIso}
      />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
