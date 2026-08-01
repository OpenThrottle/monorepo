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
import { ScheduledAgentJobRunDetailDocument } from '~/__generated__/graphql';
import { QueueJobLogConsole } from '~/routing/queues/components/QueueJobLogConsole';
import { RunDetail } from '~/routing/scheduled-jobs/components/RunDetail';
import {
  RUN_DETAIL_COPY,
  RUN_STATUS_TO_JOB_STATE,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from '~/routing/scheduled-jobs/data/data.run-detail';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/scheduled-jobs.$jobId.runs.$runId';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Run',
  links: (match) => [
    { children: 'Scheduled Jobs', to: '/scheduled-jobs' },
    {
      children: match.loaderData?.job?.name,
      to: `/scheduled-jobs/${match.loaderData?.job?.id}`,
    },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { jobId, runId } = args.params;

  const { scheduledAgentJob, scheduledAgentJobRun } =
    await executeGraphqlWithAuth(
      args.request,
      ScheduledAgentJobRunDetailDocument,
      { jobId, runId },
    );

  if (scheduledAgentJobRun == null) {
    throw new Response('Scheduled job run not found', { status: 404 });
  }

  return {
    job: scheduledAgentJob,
    queueName: SCHEDULED_AGENT_JOBS_QUEUE_NAME,
    run: scheduledAgentJobRun,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Scheduled job run | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData, params } = props;

  // Hooks

  // Setup
  const { job, queueName, run } = loaderData;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="flex flex-col gap-6" data-testid="ScheduledJobRunDetail">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Run</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {job?.name ?? 'Scheduled job'}
            </p>
          </div>

          <Button asChild={true} variant="outline">
            <Link to={`/scheduled-jobs/${params.jobId}`}>Back to job</Link>
          </Button>
        </div>

        <RunDetail run={run} />

        <section>
          <h2 className="mb-2 text-sm font-medium">
            {RUN_DETAIL_COPY.logsHeading}
          </h2>
          {run.bullmqJobId ? (
            <QueueJobLogConsole
              jobId={run.bullmqJobId}
              jobState={RUN_STATUS_TO_JOB_STATE[run.status] ?? 'waiting'}
              queueName={queueName}
            />
          ) : (
            <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
              {RUN_DETAIL_COPY.logsPending}
            </p>
          )}
        </section>
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
