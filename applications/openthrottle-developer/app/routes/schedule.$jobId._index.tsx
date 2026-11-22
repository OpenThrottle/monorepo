import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { Button } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import { CalendarClockIcon } from 'lucide-react';
import * as React from 'react';
import { Form, Link } from 'react-router';

import type { Route } from '@/app/routes/+types/schedule.$jobId._index';
import { ScheduledAgentJobDetailDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { ScheduleApprovalNotice } from '~/routing/schedule/components/ScheduleApprovalNotice';
import { ScheduleDetailSummary } from '~/routing/schedule/components/ScheduleDetailSummary';
import { ScheduleDetailTabs } from '~/routing/schedule/components/ScheduleDetailTabs';
import { ScheduleRunNowButton } from '~/routing/schedule/components/ScheduleRunNowButton';
import { ScheduleWebhookTab } from '~/routing/schedule/components/ScheduleWebhookTab';
import { useScheduleWebhookReveal } from '~/routing/schedule/hooks/useScheduleWebhookReveal';
import { runScheduleJobAction } from '~/routing/schedule/utils/runScheduleJobAction';

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

  const {
    scheduledAgentJob,
    scheduledAgentJobRuns,
    scheduledAgentJobWebhookTrigger,
  } = await executeGraphqlWithAuth(
    args.request,
    ScheduledAgentJobDetailDocument,
    { id: jobId },
  );

  if (scheduledAgentJob == null) {
    throw new Response('Scheduled job not found', { status: 404 });
  }

  return {
    job: scheduledAgentJob,
    runs: scheduledAgentJobRuns,
    webhookTrigger: scheduledAgentJobWebhookTrigger ?? null,
  };
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
  const { job, runs, webhookTrigger } = loaderData;

  // Hooks
  const reveal = useScheduleWebhookReveal({ actionData });

  // Setup
  const actionError = getActionError(actionData);
  const hasWebhookError = actionData != null && 'webhookError' in actionData;
  const webhookError = hasWebhookError ? actionData.webhookError : undefined;
  const isPendingApproval = job.approvalState === 'pending';

  // Handlers

  // Markup
  const enableToggle = (
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
  );
  const webhookTab = (
    <ScheduleWebhookTab
      credentials={reveal.credentials}
      error={webhookError}
      jobId={job.id}
      onDismissCredentials={reveal.dismiss}
      trigger={webhookTrigger}
    />
  );
  const errorAlert = (
    <p className="text-destructive text-sm" role="alert">
      {actionError}
    </p>
  );

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
              {isPendingApproval ? null : enableToggle}
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

      <ScheduleApprovalNotice job={job} />

      <div className="flex flex-col gap-6" data-testid="ScheduleDetail">
        {actionError ? errorAlert : null}

        <ScheduleDetailTabs
          jobId={job.id}
          prompt={job.prompt}
          runs={runs}
          webhook={webhookTab}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  return runScheduleJobAction(args.request, args.params.jobId);
};

export const ErrorBoundary = GlobalErrorBoundary;
