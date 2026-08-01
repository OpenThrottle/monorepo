import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Await, Link, useFetcher, useNavigate } from 'react-router';
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
import { DashboardActivityChartSkeleton } from '~/routing/dashboard/components/DashboardActivityChartSkeleton';
import { DashboardDailyStatsCard } from '~/routing/dashboard/components/DashboardDailyStatsCard';
import { DashboardQueueHealthCard } from '~/routing/dashboard/components/DashboardQueueHealthCard';
import { DashboardDailyStatsModal } from '~/routing/dashboard/components/DashboardDailyStatsModal';
import { DashboardIntroduction } from '~/routing/dashboard/components/DashboardIntroduction';
import { DashboardOpenPrsByAuthorCard } from '~/routing/dashboard/components/DashboardOpenPrsByAuthorCard';
import { DashboardPrCardsSkeleton } from '~/routing/dashboard/components/DashboardPrCardsSkeleton';
import { DashboardPrTimeInStateCard } from '~/routing/dashboard/components/DashboardPrTimeInStateCard';
import { DashboardRecentActivity } from '~/routing/dashboard/components/DashboardRecentActivity';
// import { DashboardStats } from '~/routing/dashboard/components/DashboardStats';
import { DashboardToolbar } from '~/routing/dashboard/components/DashboardToolbar';
import { parseDashboardGithubParams } from '~/routing/dashboard/utils/parsers';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/dashboard._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Dashboard',
  links: (_match) => [],
};

export const loader = (args: Route.LoaderArgs) => {
  const end = new Date();
  const endIso = end.toISOString();

  const { owner, repo } = parseDashboardGithubParams(args.url.searchParams);

  const start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();

  const variables: GetDashboardQueryVariables = {
    end: endIso,
    input: { daysBack: 7 },
    start: startIso,
  };

  // Fire both queries concurrently (no serial waitfall) and return two
  // independent naked promises so the "This Week's Activity" chart streams as
  // soon as the dashboard query lands, without waiting on the slower GitHub API
  // round-trip. RR8 Single Fetch serializes/streams the promise fields. The
  // dashboard call is invoked first (call #1), githubStats second (call #2).
  const core = executeGraphqlWithAuth(
    args.request,
    GetDashboardDocument,
    variables,
  ).then((result) => ({
    activityByDate: result.activityByDate,
    dailyStatsRange: result.dailyStatsRange,
    queues: result.queues,
  }));

  const githubStats = executeGraphqlWithAuth(
    args.request,
    GetDashboardGithubStatsDocument,
    { owner, repo },
  );

  return { core, githubStats };
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
  const { core, githubStats } = loaderData;

  // Hooks
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();

  // Setup
  const _isIdle = fetcher.state !== 'idle';
  const _devMessage =
    fetcher.data != null && 'devTriggerWebsocket' in fetcher.data
      ? fetcher.data.devTriggerWebsocket
      : null;

  // Handlers
  const handleSelectDate = React.useCallback(
    (date: string): void => {
      navigate(
        `/dashboard?modal=${DashboardDailyStatsModal.key}&date=${date}`,
        { preventScrollReset: true, viewTransition: true },
      );
    },
    [navigate],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      {/* <DashboardStats /> */}
      <DashboardIntroduction />

      <div
        className="--lg:grid-cols-3 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8 lg:gap-12"
        data-testid="dashboard-content-grid"
      >
        <div className="col-span-2 md:col-span-1">
          <React.Suspense fallback={<DashboardPrCardsSkeleton />}>
            <Await
              errorElement={
                <p className="text-muted-foreground text-sm">
                  Couldn&rsquo;t load queue health.
                </p>
              }
              resolve={core}
            >
              {(data) => <DashboardQueueHealthCard queues={data.queues} />}
            </Await>
          </React.Suspense>
        </div>

        <div className="col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2>This Week's Activity</h2>
            <Button asChild={true} size="sm" variant="outline">
              <Link
                preventScrollReset={true}
                to="/dashboard?modal=daily-stats"
                viewTransition={true}
              >
                Expand chart details
              </Link>
            </Button>
          </div>
          {/* Deferred (core): streams as soon as the dashboard query lands. */}
          <React.Suspense fallback={<DashboardActivityChartSkeleton />}>
            <Await
              errorElement={
                <p className="text-muted-foreground text-sm">
                  Couldn&rsquo;t load this week&rsquo;s activity.
                </p>
              }
              resolve={core}
            >
              {(data) => (
                <DashboardDailyStatsCard
                  dailyStats={data.dailyStatsRange.items}
                  onSelectDate={handleSelectDate}
                />
              )}
            </Await>
          </React.Suspense>
        </div>

        <DashboardToolbar className="col-span-2" />

        <div>
          <h3 className="mb-4">PR Time in State</h3>
          {/* Deferred (githubStats): its own boundary so the GitHub round-trip
              never blocks the activity chart. errorElement degrades the card. */}
          <React.Suspense fallback={<DashboardPrCardsSkeleton />}>
            <Await
              errorElement={
                <p className="text-muted-foreground text-sm">
                  Couldn&rsquo;t load PR stats.
                </p>
              }
              resolve={githubStats}
            >
              {(stats) => (
                <DashboardPrTimeInStateCard
                  prTimeInStateSummary={stats.prTimeInStateSummary}
                />
              )}
            </Await>
          </React.Suspense>
        </div>

        <div>
          <h3 className="mb-4">PRs by author</h3>
          <React.Suspense fallback={<DashboardPrCardsSkeleton />}>
            <Await
              errorElement={
                <p className="text-muted-foreground text-sm">
                  Couldn&rsquo;t load PR stats.
                </p>
              }
              resolve={githubStats}
            >
              {(stats) => <DashboardOpenPrsByAuthorCard githubStats={stats} />}
            </Await>
          </React.Suspense>
        </div>

        <div className="col-span-2">
          <React.Suspense fallback={<DashboardActivityChartSkeleton />}>
            <Await
              errorElement={
                <p className="text-muted-foreground text-sm">
                  Couldn&rsquo;t load recent activity.
                </p>
              }
              resolve={core}
            >
              {(data) => <DashboardRecentActivity data={data.activityByDate} />}
            </Await>
          </React.Suspense>
        </div>

        {/* <div>
          <h3 className="text-lg mb-4">Development</h3>
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
        </div> */}
      </div>

      {/* Portal-rendered (Dialog): invisible until ?modal=daily-stats, so a
          null fallback is fine and it simply waits on the core promise. */}
      <React.Suspense fallback={null}>
        <Await errorElement={null} resolve={core}>
          {(data) => (
            <DashboardDailyStatsModal dailyStats={data.dailyStatsRange.items} />
          )}
        </Await>
      </React.Suspense>
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
