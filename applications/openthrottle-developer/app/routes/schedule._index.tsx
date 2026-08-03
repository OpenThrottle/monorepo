import * as React from 'react';
import { Link } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Button } from '@openthrottle/react-router-shadcn';
import { ScheduledAgentJobsDocument } from '~/__generated__/graphql';
import { ScheduledJobsTable } from '~/routing/scheduled-jobs/components/ScheduledJobsTable';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/scheduled-jobs._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Scheduled Jobs',
  links: (_match) => [{ children: 'Agents', to: '/queues' }],
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
  return [{ title: `Scheduled Jobs | ${SITE_TITLE}` }];
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Scheduled jobs</h1>
            <p className="text-muted-foreground text-sm">
              Run an agent prompt on a cron schedule.
            </p>
          </div>
          <Button asChild={true}>
            <Link to="/scheduled-jobs/create">New schedule</Link>
          </Button>
        </div>

        {jobs.length === 0 ? (
          <p
            className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm"
            data-testid="ScheduledJobsEmpty"
          >
            No scheduled jobs yet. Create one to run a prompt on a schedule.
          </p>
        ) : (
          <ScheduledJobsTable className="bg-card" jobs={jobs} />
        )}
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
