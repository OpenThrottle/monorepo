import * as React from 'react';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  IS_BROWSER,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import { SITE_TITLE } from '~/global/config/settings';
import { ScheduleCalendar } from '~/routing/schedule/components/ScheduleCalendar';
import { CALENDAR_DEMO_EVENTS } from '~/routing/schedule/data/data.calendar-demo';
import type { Route } from '@/app/routes/+types/schedule.calendar';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Calendar',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {
    events: CALENDAR_DEMO_EVENTS,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Schedule Calendar | ${SITE_TITLE}` }];
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
    <GlobalScreen className="flex-1 p-4 md:p-8">
      {IS_BROWSER ? <ScheduleCalendar events={events} /> : null}
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
