import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
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
import { DashboardDailyStatsModal } from '~/routing/dashboard/components/DashboardDailyStatsModal';
import { DashboardIntroduction } from '~/routing/dashboard/components/DashboardIntroduction';
import { DashboardOpenPrsByAuthorCard } from '~/routing/dashboard/components/DashboardOpenPrsByAuthorCard';
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

export const loader = async (args: Route.LoaderArgs) => {
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

  const result = await executeGraphqlWithAuth(
    args.request,
    GetDashboardDocument,
    variables,
  );

  const { activityByDate, dailyStatsRange, queues } = result;
  const githubStats = await executeGraphqlWithAuth(
    args.request,
    GetDashboardGithubStatsDocument,
    { owner, repo },
  );

  return { activityByDate, dailyStatsRange, githubStats, queues };
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
  const {
    activityByDate,
    dailyStatsRange,
    githubStats,
    queues: _queues,
  } = loaderData;

  // Hooks
  const fetcher = useFetcher<typeof action>();

  // Setup
  const _isIdle = fetcher.state !== 'idle';
  const _devMessage =
    fetcher.data != null && 'devTriggerWebsocket' in fetcher.data
      ? fetcher.data.devTriggerWebsocket
      : null;

  // Handlers

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
        {/*
        <DashboardQueueStats data={queues} />
        <DashboardQuickNavigation />
        */}

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
          <DashboardDailyStatsCard dailyStats={dailyStatsRange.items} />
        </div>

        <DashboardToolbar className="col-span-2" />

        <div>
          <h3 className="mb-4">PR Time in State</h3>
          <DashboardPrTimeInStateCard
            prTimeInStateSummary={githubStats.prTimeInStateSummary}
          />
        </div>

        <div>
          <h3 className="mb-4">PRs by author</h3>
          <DashboardOpenPrsByAuthorCard githubStats={githubStats} />
        </div>

        <DashboardRecentActivity className="col-span-2" data={activityByDate} />

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
