import * as React from 'react';
import { DashboardDailyStatsCard } from '~/routing/dashboard/components/DashboardDailyStatsCard';
import {
  GetUsageDailyStatsDocument,
  GetUsageTokenUsageDocument,
} from '~/__generated__/graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { SITE_TITLE } from '~/global/config/settings';
import { UsageAnalyticsGaps } from '~/routing/usage/components/UsageAnalyticsGaps';
import { UsageDailyActivityOverview } from '~/routing/usage/components/UsageDailyActivityOverview';
import { UsageIntroduction } from '~/routing/usage/components/UsageIntroduction';
import { UsageOverview } from '~/routing/usage/components/UsageOverview';
import { UsageSnapshot } from '~/routing/usage/components/UsageSnapshot';
import { UsageTokenUsage } from '~/routing/usage/components/UsageTokenUsage';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/usage._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Usage',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const providerParam = new URL(args.request.url).searchParams.get('provider');
  const selectedProvider =
    providerParam !== null && providerParam !== '' ? providerParam : null;

  const end = new Date();
  const endIso = end.toISOString();

  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();

  // tokenUsage filters on YYYY-MM-DD (see the tokenUsage resolver contract).
  const startDate = startIso.slice(0, 10);
  const endDate = endIso.slice(0, 10);

  const [dailyResult, tokenUsageResult] = await Promise.all([
    executeGraphqlWithAuth(args.request, GetUsageDailyStatsDocument, {
      end: endIso,
      start: startIso,
    }),
    executeGraphqlWithAuth(args.request, GetUsageTokenUsageDocument, {
      end: endDate,
      provider: selectedProvider,
      start: startDate,
    }),
  ]);

  const dailyStats: DashboardDailyStatsCardFragment[] =
    dailyResult.dailyStatsRange.items ?? [];

  return {
    dailyStats,
    rangeDays: 30,
    rangeEndIso: endIso,
    rangeStartIso: startIso,
    selectedProvider,
    tokenUsageItems: tokenUsageResult.tokenUsage.items,
    tokenUsageTotals: tokenUsageResult.tokenUsage.totals,
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
  const {
    dailyStats,
    rangeDays,
    rangeEndIso,
    rangeStartIso,
    selectedProvider,
    tokenUsageItems,
    tokenUsageTotals,
  } = loaderData;

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
      <UsageTokenUsage
        items={tokenUsageItems}
        rangeDays={rangeDays}
        selectedProvider={selectedProvider}
        totals={tokenUsageTotals}
      />
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

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
