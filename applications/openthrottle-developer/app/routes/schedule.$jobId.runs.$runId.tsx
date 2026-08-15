import * as React from 'react';
import { Form, Link } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  CancelScheduledAgentJobRunDocument,
  ScheduledAgentJobRunDetailDocument,
} from '~/__generated__/graphql';
import { QueueJobLogConsole } from '~/routing/queues/components/QueueJobLogConsole';
import { RunDetail } from '~/routing/schedule/components/RunDetail';
import {
  CANCELABLE_RUN_STATUSES,
  RUN_DETAIL_COPY,
  RUN_STATUS_TO_JOB_STATE,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from '~/routing/schedule/data/data.run-detail';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/schedule.$jobId.runs.$runId';
import { CalendarDaysIcon } from 'lucide-react';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Run',
  links: (match) => [
    { children: 'Schedule', to: '/schedule' },
    {
      children: match.loaderData?.job?.name,
      to: `/schedule/${match.loaderData?.job?.id}`,
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
  const { actionData, loaderData, params } = props;

  // Hooks

  // Setup
  const { job, queueName, run } = loaderData;
  const actionError = getActionError(actionData);
  const cancelRequested = run.cancelRequestedAt != null;
  const canCancel = CANCELABLE_RUN_STATUSES.has(run.status) && !cancelRequested;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="flex flex-col gap-6" data-testid="ScheduleRunDetail">
        <div className="flex items-start justify-between gap-4">
          <div>
            <GlobalHeading heading="h1" icon={CalendarDaysIcon} title="Run" />
            <p className="text-muted-foreground mt-1 text-sm">
              {job?.name ?? 'Scheduled job'}
            </p>
          </div>

          <div className="flex gap-2">
            {canCancel ? (
              <Form method="post">
                <input name="intent" type="hidden" value="cancel-run" />
                <Button type="submit" variant="destructive">
                  {RUN_DETAIL_COPY.cancel}
                </Button>
              </Form>
            ) : null}
            {cancelRequested && CANCELABLE_RUN_STATUSES.has(run.status) ? (
              <Button disabled={true} variant="outline">
                {RUN_DETAIL_COPY.cancelRequested}
              </Button>
            ) : null}
            <Button asChild={true} variant="outline">
              <Link to={`/schedule/${params.jobId}`}>Back to job</Link>
            </Button>
          </div>
        </div>

        {actionError ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}

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

export const action = async (args: Route.ActionArgs) => {
  const { runId } = args.params;
  const form = await args.request.formData();
  const intent = form.get('intent');

  try {
    if (intent === 'cancel-run') {
      const { cancelScheduledAgentJobRun } = await executeGraphqlWithAuth(
        args.request,
        CancelScheduledAgentJobRunDocument,
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
