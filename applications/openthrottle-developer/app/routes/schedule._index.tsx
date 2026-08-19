import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
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
import { ScheduledAgentJobsDocument } from '~/__generated__/graphql';
import { ScheduleIntroduction } from '~/routing/schedule/components/ScheduleIntroduction';
import { ScheduleTable } from '~/routing/schedule/components/ScheduleTable';
import { ScheduleToolbar } from '~/routing/schedule/components/ScheduleToolbar';
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

  const { scheduledAgentJobs } = await executeGraphqlWithAuth(
    args.request,
    ScheduledAgentJobsDocument,
  );

  const jobs = filterJobsBySearch(scheduledAgentJobs, search);

  return { jobs, search };
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
  const { jobs, search } = loaderData;

  // Hooks

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

        <div className="flex flex-col gap-4">
          <ScheduleToolbar />
          {isNewUser ? (
            <GlobalFeatureOnboarding content={SCHEDULE_ONBOARDING} />
          ) : jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {SCHEDULE_COPY.noSearchResults}
            </p>
          ) : (
            <ScheduleTable className="bg-card" jobs={jobs} />
          )}
        </div>
      </GlobalScreen>
      <GlobalFeatureOnboardingModal content={SCHEDULE_ONBOARDING} />
    </>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
