import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalFeatureOnboarding,
  GlobalFeatureOnboardingModal,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { ScheduledAgentJobsDocument } from '~/__generated__/graphql';
import { ScheduleIntroduction } from '~/routing/schedule/components/ScheduleIntroduction';
import { ScheduleTable } from '~/routing/schedule/components/ScheduleTable';
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
  const { scheduledAgentJobs } = await executeGraphqlWithAuth(
    args.request,
    ScheduledAgentJobsDocument,
  );

  return { jobs: scheduledAgentJobs };
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
  const { jobs } = loaderData;

  // Hooks

  // Setup

  // Schedule has no filters, so an empty list always means a genuinely-new
  // user — show the rich onboarding pitch instead of the terse empty paragraph.
  const isNewUser = jobs.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <GlobalFeatureOnboardingModal content={SCHEDULE_ONBOARDING} />
      <ScheduleIntroduction />

      {isNewUser ? (
        <GlobalFeatureOnboarding content={SCHEDULE_ONBOARDING} />
      ) : (
        <ScheduleTable className="bg-card" jobs={jobs} />
      )}
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
