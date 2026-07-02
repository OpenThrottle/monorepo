import * as React from 'react';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import { ScheduleForm } from '~/routing/schedule/components/ScheduleForm';
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
  return [{ title: `Create event | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <ScheduleForm action="create" />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  const title = formData.get('title');
  const startsAt = formData.get('startsAt');

  if (typeof title !== 'string' || title.trim().length === 0) {
    return { error: 'Title is required.' };
  }

  if (typeof startsAt !== 'string' || startsAt.length === 0) {
    return { error: 'Start time is required.' };
  }

  // NOTE: schedule data is stubbed, so there is nothing to persist yet — redirect
  // back to the list. Swap for a create mutation + redirect to /schedule/:eventId
  // once the backend lands (plan 26594427).
  return redirect('/schedule');
};

export const ErrorBoundary = GlobalErrorBoundary;
