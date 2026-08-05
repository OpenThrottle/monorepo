import * as React from 'react';
import { Link } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Button } from '@openthrottle/react-router-shadcn';
import { ScheduledAgentJobsDocument } from '~/__generated__/graphql';
import { ScheduleTable } from '~/routing/schedule/components/ScheduleTable';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/schedule._index';
import { CalendarClockIcon } from 'lucide-react';

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
  return [{ title: `Schedule | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const { jobs } = loaderData;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <>
        <div>
          <GlobalHeading
            className="mb-4"
            heading="h1"
            icon={CalendarClockIcon}
            title="Schedule"
          >
            <Button asChild={true} size="xs">
              <Link to="/schedule/create">New schedule</Link>
            </Button>
          </GlobalHeading>
          <p className="text-muted-foreground text-sm">
            Run an agent prompt on a cron schedule.
          </p>
        </div>

        {jobs.length === 0 ? (
          <p
            className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm"
            data-testid="ScheduleEmpty"
          >
            No scheduled jobs yet. Create one to run a prompt on a schedule.
          </p>
        ) : (
          <ScheduleTable className="bg-card" jobs={jobs} />
        )}
      </>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
