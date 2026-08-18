import * as React from 'react';
import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import {
  ScheduleFormAgentClisDocument,
  ScheduledAgentJobDetailDocument,
  UpdateScheduledAgentJobDocument,
  type UpdateScheduledAgentJobInputType,
} from '~/__generated__/graphql';
import { ScheduleForm } from '~/routing/schedule/components/ScheduleForm';
import { parseScheduleForm } from '~/routing/schedule/data/parse-form';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/schedule.$jobId.edit';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Edit',
  links: (match) => [
    { children: 'Schedule', to: '/schedule' },
    {
      children: match.loaderData?.job?.name,
      to: `/schedule/${match.loaderData?.job?.id}`,
    },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { jobId } = args.params;

  const { scheduledAgentJob } = await executeGraphqlWithAuth(
    args.request,
    ScheduledAgentJobDetailDocument,
    { id: jobId },
  );

  if (scheduledAgentJob == null) {
    throw new Response('Scheduled job not found', { status: 404 });
  }

  // Advisory only — see the create route: a discovery failure degrades to "unverifiable".
  let agentClis;
  try {
    const { discoverAgentClis } = await executeGraphqlWithAuth(
      args.request,
      ScheduleFormAgentClisDocument,
      {},
    );
    agentClis = discoverAgentClis.agents;
  } catch {
    agentClis = undefined;
  }

  return { agentClis, job: scheduledAgentJob };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Edit scheduled job | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData } = props;

  // Hooks

  // Setup
  const { agentClis, job } = loaderData;
  const actionError = getActionError(actionData);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <h1 className="mb-4 text-xl font-semibold">Edit scheduled job</h1>
      <ScheduleForm
        action="update"
        agentClis={agentClis}
        error={actionError}
        job={job}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { jobId } = args.params;
  const form = await args.request.formData();
  const { enabled: _enabled, ...patch } = parseScheduleForm(form);

  if (!patch.name || !patch.prompt || !patch.driverId || !patch.cronPattern) {
    return { error: 'Name, prompt, provider, and schedule are required.' };
  }

  const input: UpdateScheduledAgentJobInputType = { id: jobId, ...patch };

  try {
    await executeGraphqlWithAuth(
      args.request,
      UpdateScheduledAgentJobDocument,
      { input },
    );
    return redirect(`/schedule/${jobId}`);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to update schedule.',
    };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
