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
  CreateScheduledAgentJobDocument,
  type CreateScheduledAgentJobInputType,
} from '~/__generated__/graphql';
import { ScheduleForm } from '~/routing/schedule/components/ScheduleForm';
import { parseScheduleForm } from '~/routing/schedule/data/parse-form';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/schedule.create';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create',
  links: (_match) => [{ children: 'Schedule', to: '/schedule' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create scheduled job | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const actionError = getActionError(actionData);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <h1 className="mb-4 text-xl font-semibold">New scheduled job</h1>
      <ScheduleForm action="create" error={actionError} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const form = await args.request.formData();
  const parsed = parseScheduleForm(form);

  if (
    !parsed.name ||
    !parsed.prompt ||
    !parsed.driverId ||
    !parsed.cronPattern
  ) {
    return { error: 'Name, prompt, provider, and schedule are required.' };
  }

  const input: CreateScheduledAgentJobInputType = {
    cronPattern: parsed.cronPattern,
    cwd: parsed.cwd ?? null,
    driverId: parsed.driverId,
    enabled: parsed.enabled,
    model: parsed.model ?? null,
    name: parsed.name,
    prompt: parsed.prompt,
    settingsJson: parsed.settingsJson ?? null,
    timeoutMs: parsed.timeoutMs ?? null,
    timezone: parsed.timezone ?? null,
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreateScheduledAgentJobDocument,
      { input },
    );
    return redirect(`/schedule/${result.createScheduledAgentJob.id}`);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to create schedule.',
    };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
