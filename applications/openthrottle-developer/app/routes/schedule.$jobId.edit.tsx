import * as React from 'react';
import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  ScheduledAgentJobDetailDocument,
  UpdateScheduledAgentJobDocument,
  type UpdateScheduledAgentJobInputType,
} from '~/__generated__/graphql';
import { ScheduledJobForm } from '~/routing/scheduled-jobs/components/ScheduledJobForm';
import { parseScheduledJobForm } from '~/routing/scheduled-jobs/data/parse-form';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/scheduled-jobs.$jobId.edit';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Edit',
  links: (match) => [
    { children: 'Scheduled Jobs', to: '/scheduled-jobs' },
    {
      children: match.loaderData?.job?.name,
      to: `/scheduled-jobs/${match.loaderData?.job?.id}`,
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

  return { job: scheduledAgentJob };
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
  const { job } = loaderData;
  const actionError =
    actionData != null && 'error' in actionData ? actionData.error : undefined;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <h1 className="mb-4 text-xl font-semibold">Edit scheduled job</h1>
      <ScheduledJobForm action="update" error={actionError} job={job} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { jobId } = args.params;
  const form = await args.request.formData();
  const { enabled: _enabled, ...patch } = parseScheduledJobForm(form);

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
    return redirect(`/scheduled-jobs/${jobId}`);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to update schedule.',
    };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
