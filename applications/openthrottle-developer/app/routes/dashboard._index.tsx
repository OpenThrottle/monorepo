import * as React from 'react';
import { Button, Card } from '@openthrottle/react-router-shadcn';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleStatCard } from '@openthrottle/react-router-ui';
import { useFetcher } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
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

export const loader = async (args: Route.LoaderArgs) => {
  const end = new Date();
  const endIso = end.toISOString();

  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
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
      {
        input: { owner: 'visormatt', repo: 'monorepo', state: 'draft' },
      },
    );

    return { activityByDate, dailyStatsRange, githubStats, queues };
  } catch (error) {
    console.error('💥 💥 💥 💥 Error loading dashboard:', error);

    throw error;
  }
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

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
    <main className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full gap-4 lg:gap-8 flex flex-col">
      <div className="grid md:grid-cols-3 gap-4 lg:gap-8">
        <OpenThrottleStatCard title="Total plans" value={12} />
        <OpenThrottleStatCard title="Active tasks" value={3} />
        <OpenThrottleStatCard title="Scheduled tasks" value={23} />
      </div>

      {/* <GlobalHeading heading="Dashboard" /> */}

      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8"
        data-testid="dashboard-content-grid"
      >
        <div
          className="col-span-1 flex min-w-0 flex-col gap-4 lg:gap-8"
          data-testid="dashboard-charts-column"
        >
          <Card className="p-8 rounded-xl">
            <h2 className="text-lg font-bold">Daily Stats</h2>
            <DashboardDailyStatsCard dailyStats={dailyStatsRange.items} />
          </Card>

          <Card className="p-4 lg:p-8">
            <h3 className="text-lg font-bold">PR Time in State</h3>
            <DashboardPrTimeInStateCard
              prTimeInStateSummary={githubStats.prTimeInStateSummary}
            />
          </Card>

          <DashboardQueueStats data={queues} />

          <Card className="p-4 lg:p-8">
            <h3 className="text-lg font-bold">Open PRs by Author</h3>
            <DashboardOpenPrsByAuthorCard
              openPrCountByAuthor={githubStats.openPrCountByAuthor}
            />
          </Card>

          <Card className="p-4 lg:p-8">
            <h3 className="text-lg font-bold mb-4">Development</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Trigger a test websocket notification to verify the notification
              flow end-to-end. Check the notification bell for the alert.
            </p>
            <fetcher.Form method="post">
              <input
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
          </Card>
          <div className="flex-1" />
        </div>

        <div
          className="col-span-2 min-w-0"
          data-testid="dashboard-activity-column"
        >
          <DashboardRecentActivity data={activityByDate} />
        </div>
      </div>
    </main>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent !== 'triggerWebsocketNotification') {
    return {};
  }

  try {
    await executeGraphqlWithAuth(args.request, TriggerNotificationDocument);

    return { devTriggerWebsocket: { success: true } };
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    return { devTriggerWebsocket: { error: message } };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
