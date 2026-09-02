import * as React from 'react';
import { Form, Link, redirect } from 'react-router';
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
import { CalendarClockIcon } from 'lucide-react';
import {
  DeleteScheduledAgentJobDocument,
  RunScheduledAgentJobNowDocument,
  ScheduledAgentJobDetailDocument,
  SetScheduledAgentJobEnabledDocument,
} from '~/__generated__/graphql';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { ScheduleDetailSummary } from '~/routing/schedule/components/ScheduleDetailSummary';
import { ScheduleDetailTabs } from '~/routing/schedule/components/ScheduleDetailTabs';
import { ScheduleRunNowButton } from '~/routing/schedule/components/ScheduleRunNowButton';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/schedule.$jobId._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="cursor-pointer whitespace-nowrap"
      label={match.loaderData?.job?.name ?? 'Schedule'}
      text={match.params.jobId ?? 'not-found'}
    />
  ),
  links: (_match) => [{ children: 'Schedule', to: '/schedule' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { jobId } = args.params;

  const { scheduledAgentJob, scheduledAgentJobRuns } =
    await executeGraphqlWithAuth(
      args.request,
      ScheduledAgentJobDetailDocument,
      { id: jobId },
    );

  if (scheduledAgentJob == null) {
    throw new Response('Scheduled job not found', { status: 404 });
  }

  return { job: scheduledAgentJob, runs: scheduledAgentJobRuns };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Scheduled job | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { job, runs } = loaderData;

  // Hooks

  // Setup
  const actionError = getActionError(actionData);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          children={
            <div className="flex gap-2">
              <Button asChild={true} size="xs" variant="outline">
                <Link to="./edit">Edit</Link>
              </Button>
              <ScheduleRunNowButton jobId={job.id} />
              <Form method="post">
                <input name="intent" type="hidden" value="toggle-enabled" />
                <input
                  name="enabled"
                  type="hidden"
                  value={job.enabled ? 'false' : 'true'}
                />
                <Button size="xs" type="submit" variant="outline">
                  {job.enabled ? 'Disable' : 'Enable'}
                </Button>
              </Form>
              <Form method="post">
                <input name="intent" type="hidden" value="delete" />
                <Button size="xs" type="submit" variant="destructive">
                  Delete
                </Button>
              </Form>
            </div>
          }
          className="mb-4"
          heading="h1"
          icon={CalendarClockIcon}
          title={job.name}
        />

        <ScheduleDetailSummary job={job} />
      </div>

      <div className="flex flex-col gap-6" data-testid="ScheduleDetail">
        {actionError ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}

        <ScheduleDetailTabs jobId={job.id} prompt={job.prompt} runs={runs} />
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { jobId } = args.params;
  const form = await args.request.formData();
  const intent = form.get('intent');

  try {
    if (intent === 'run-now') {
      const { runScheduledAgentJobNow } = await executeGraphqlWithAuth(
        args.request,
        RunScheduledAgentJobNowDocument,
        {
          id: jobId,
        },
      );
      return { ok: true, runId: runScheduledAgentJobNow.id };
    }

    if (intent === 'toggle-enabled') {
      const enabled = form.get('enabled') === 'true';
      await executeGraphqlWithAuth(
        args.request,
        SetScheduledAgentJobEnabledDocument,
        { input: { enabled, id: jobId } },
      );
      return { ok: true };
    }

    if (intent === 'delete') {
      await executeGraphqlWithAuth(
        args.request,
        DeleteScheduledAgentJobDocument,
        {
          id: jobId,
        },
      );
      return redirect('/schedule');
    }

    return { error: 'Unknown action.' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Action failed.',
    };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
