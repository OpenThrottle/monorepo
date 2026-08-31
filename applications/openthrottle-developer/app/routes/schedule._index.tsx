import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { buildInFlightByJob } from '~/routing/schedule/utils/build-in-flight-by-job';
import { filterJobsBySearch } from '~/routing/schedule/utils/filter-jobs-by-search';
import {
  GlobalErrorBoundary,
  GlobalFeatureOnboarding,
  GlobalFeatureOnboardingModal,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
  readSearchParam,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  CancelScheduleIndexRunDocument,
  ScheduledAgentJobsDocument,
} from '~/__generated__/graphql';
import { ScheduleActiveRuns } from '~/routing/schedule/components/ScheduleActiveRuns';
import { ScheduleIntroduction } from '~/routing/schedule/components/ScheduleIntroduction';
import { ScheduleStats } from '~/routing/schedule/components/ScheduleStats';
import { ScheduleTable } from '~/routing/schedule/components/ScheduleTable';
import { ScheduleToolbar } from '~/routing/schedule/components/ScheduleToolbar';
import { useScheduleAutoRefresh } from '~/routing/schedule/hooks/useScheduleAutoRefresh';
import { SITE_TITLE } from '~/global/config/settings';
import {
  SCHEDULE_COPY,
  SCHEDULE_ONBOARDING,
} from '~/routing/schedule/data/data.copy';
import type { Route } from '@/app/routes/+types/schedule._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Schedule',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const search = readSearchParam(searchParams);

  const {
    scheduledAgentJobRunStats,
    scheduledAgentJobRunsInFlight,
    scheduledAgentJobs,
  } = await executeGraphqlWithAuth(args.request, ScheduledAgentJobsDocument);

  // Search filters the schedule list only. Activity and stats are deliberately
  // global: what is running right now does not stop being relevant because the
  // search box happens to be narrowed to something else.
  const jobs = filterJobsBySearch(scheduledAgentJobs, search);

  return {
    inFlightByJob: buildInFlightByJob(scheduledAgentJobRunsInFlight),
    inFlightRuns: scheduledAgentJobRunsInFlight,
    jobs,
    runStats: scheduledAgentJobRunStats,
    search,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `${SCHEDULE_COPY.pageTitle} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { inFlightByJob, inFlightRuns, jobs, runStats, search } = loaderData;

  // Hooks
  // Polling, not a subscription: the server has no scheduled-run lifecycle
  // subscription to listen to yet (follow-up). Idle pages poll not at all.
  useScheduleAutoRefresh(runStats.inFlightCount);

  // Setup

  // An empty list only means a genuinely-new user when nothing was filtered
  // out — a search that matched nothing gets the no-results line instead of
  // the onboarding pitch.
  const isNewUser = jobs.length === 0 && search.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <GlobalScreen>
        <ScheduleIntroduction />

        <div className="flex flex-col gap-4 md:gap-8 lg:gap-12">
          {isNewUser ? (
            <GlobalFeatureOnboarding content={SCHEDULE_ONBOARDING} />
          ) : jobs.length === 0 ? (
            <div className="flex flex-col gap-4">
              <ScheduleToolbar />
              <p className="text-muted-foreground text-sm">
                {SCHEDULE_COPY.noSearchResults}
              </p>
            </div>
          ) : (
            <>
              <ScheduleStats
                enabledCount={jobs.filter((job) => job.enabled).length}
                failedCount={runStats.failedCount}
                queuedCount={runStats.queuedCount}
                ranCount={runStats.windowTotalCount}
                runningCount={runStats.runningCount}
                succeededCount={runStats.succeededCount}
                totalCount={jobs.length}
              />

              <ScheduleActiveRuns runs={inFlightRuns} />

              <div className="flex flex-col gap-4">
                <ScheduleToolbar />
                <ScheduleTable
                  // className="bg-card"
                  inFlightByJob={inFlightByJob}
                  jobs={jobs}
                />
              </div>
            </>
          )}
        </div>
      </GlobalScreen>
      <GlobalFeatureOnboardingModal content={SCHEDULE_ONBOARDING} />
    </>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const form = await args.request.formData();
  const intent = form.get('intent');
  const runId = form.get('runId');

  try {
    if (intent === 'cancel-run' && typeof runId === 'string') {
      const { cancelScheduledAgentJobRun } = await executeGraphqlWithAuth(
        args.request,
        CancelScheduleIndexRunDocument,
        { runId },
      );
      return { run: cancelScheduledAgentJobRun };
    }

    return { error: 'Unknown action.' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Action failed.',
    };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
