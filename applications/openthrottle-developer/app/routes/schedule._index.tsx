import * as React from 'react';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { ScheduleIntroduction } from '~/routing/schedule/components/ScheduleIntroduction';
import { ScheduleTable } from '~/routing/schedule/components/ScheduleTable';
import { ScheduleToolbar } from '~/routing/schedule/components/ScheduleToolbar';
import { SCHEDULE_EVENTS } from '~/routing/schedule/data/data.events';
import { filterScheduleEventsBySearch } from '~/routing/schedule/utils/events';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/schedule._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Schedule',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.request.url ? new URL(args.request.url) : null;
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const search = searchParams.get('q')?.trim() ?? '';

  const events = filterScheduleEventsBySearch(SCHEDULE_EVENTS, search);

  return { events, search };
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
  const { events } = loaderData;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <ScheduleIntroduction />

      <div className="flex flex-col gap-4">
        <ScheduleToolbar />
        <ScheduleTable className="bg-card" events={events} />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
