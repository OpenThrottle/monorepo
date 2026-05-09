import * as React from 'react';
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import { Link, useFetcher } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  GetDashboardDocument,
  GetDashboardGithubStatsDocument,
  GetDashboardQueryVariables,
  TriggerNotificationDocument,
} from '~/__generated__/graphql';
import { DashboardDailyStatsCard } from '~/routing/dashboard/components/DashboardDailyStatsCard';
import { DashboardOpenPrsByAuthorCard } from '~/routing/dashboard/components/DashboardOpenPrsByAuthorCard';
import { DashboardPrTimeInStateCard } from '~/routing/dashboard/components/DashboardPrTimeInStateCard';
import { DashboardQueueStats } from '~/routing/dashboard/components/DashboardQueueStats';
import { DashboardRecentActivity } from '~/routing/dashboard/components/DashboardRecentActivity';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/dashboard._index';
import { DashboardDailyStatsModal } from '~/routing/dashboard/components/DashboardDailyStatsModal';
import { DashboardQuickNavigation } from '~/routing/dashboard/components/DashboardQuickNavigation';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Dashboard',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const end = new Date();
  const endIso = end.toISOString();

  const start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();

  const variables: GetDashboardQueryVariables = {
    end: endIso,
    input: { daysBack: 7 },
    start: startIso,
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      GetDashboardDocument,
      variables,
    );

    const { activityByDate, dailyStatsRange, queues } = result;
    const githubStats = await executeGraphqlWithAuth(
      args.request,
      GetDashboardGithubStatsDocument,
      { input: { owner: 'visormatt', repo: 'monorepo', state: 'draft' } },
    );

    return { activityByDate, dailyStatsRange, githubStats, queues };
  } catch (error) {
    console.error('💥 💥 💥 💥 Error loading dashboard:', error);

    throw error;
  }
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Dashboard | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { activityByDate, dailyStatsRange, githubStats, queues } = loaderData;

  // Hooks
  const fetcher = useFetcher<typeof action>();

  // Setup
  const isIdle = fetcher.state !== 'idle';
  const devMessage =
    fetcher.data != null && 'devTriggerWebsocket' in fetcher.data
      ? fetcher.data.devTriggerWebsocket
      : null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen
    // className="flex flex-col p-4 md:p-8 lg:p-12 gap-4 md:gap-8 lg:gap-12"
    >
      <div className="grid md:grid-cols-3 gap-4 md:gap-8 lg:gap-12">
        <OpenThrottleStatCard title="Total plans" value={12} />
        <OpenThrottleStatCard title="Active tasks" value={3} />
        <OpenThrottleStatCard title="Scheduled tasks" value={23} />
      </div>

      <div
        className="gap-4 md:gap-8 lg:gap-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        data-testid="dashboard-content-grid"
      >
        <div
          className="gap-4 md:gap-8 lg:gap-12 col-span-1 flex min-w-0 flex-col"
          data-testid="dashboard-charts-column"
        >
          <DashboardQuickNavigation />

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Daily Stats</h2>
              <Button asChild={true} size="sm" variant="outline">
                <Link to="/dashboard?modal=daily-stats" viewTransition={true}>
                  Expand chart details
                </Link>
              </Button>
            </div>
            <DashboardDailyStatsCard dailyStats={dailyStatsRange.items} />
          </div>

          <div>
            <h3 className="text-lg font-bold">PR Time in State</h3>
            <DashboardPrTimeInStateCard
              prTimeInStateSummary={githubStats.prTimeInStateSummary}
            />
          </div>

          <DashboardQueueStats data={queues} />

          <div>
            <h3 className="text-lg font-bold">Open PRs by Author</h3>
            <DashboardOpenPrsByAuthorCard
              openPrCountByAuthor={githubStats.openPrCountByAuthor}
            />
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Development</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Trigger a test websocket notification to verify the notification
              flow end-to-end. Check the notification bell for the alert.
            </p>
            <fetcher.Form method="post">
              <Input
                name="intent"
                type="hidden"
                value="triggerWebsocketNotification"
              />
              <Button disabled={isIdle} type="submit" variant="secondary">
                {isIdle ? 'Triggering…' : 'Trigger websocket notification'}
              </Button>
            </fetcher.Form>
            {devMessage != null && (
              <p
                className={
                  devMessage.success
                    ? 'text-green-600 text-sm mt-2'
                    : 'text-destructive text-sm mt-2'
                }
              >
                {devMessage.success
                  ? 'Notification triggered. Check the bell.'
                  : devMessage.error}
              </p>
            )}
          </div>
          <div className="flex-1" />
        </div>

        <div
          className="col-span-2 min-w-0"
          data-testid="dashboard-activity-column"
        >
          <DashboardRecentActivity data={activityByDate} />
        </div>
      </div>

      <DashboardDailyStatsModal />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'triggerWebsocketNotification') {
    try {
      await executeGraphqlWithAuth(args.request, TriggerNotificationDocument);

      return { devTriggerWebsocket: { success: true } };
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      return { devTriggerWebsocket: { error: message } };
    }
  }

  // 🚨 Default to invalid action error when no intent is provided.
  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
