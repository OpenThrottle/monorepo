import * as React from 'react';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalScreen,
  readSearchParam,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { CalendarIntroduction } from '~/routing/calendar/components/CalendarIntroduction';
import { CalendarTable } from '~/routing/calendar/components/CalendarTable';
import { CalendarToolbar } from '~/routing/calendar/components/CalendarToolbar';
import { CALENDAR_EVENTS } from '~/routing/calendar/data/data.events';
import { filterCalendarEventsBySearch } from '~/routing/calendar/utils/events';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/calendar.list';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'List',
  links: (_match) => [{ children: 'Calendar', to: '/calendar' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;
  const searchParams = url?.searchParams ?? new URLSearchParams();
  const search = readSearchParam(searchParams);

  const events = filterCalendarEventsBySearch(CALENDAR_EVENTS, search);

  return { events, search };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `List | Calendar | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { events } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <CalendarIntroduction />

      <div className="flex flex-col gap-4">
        <CalendarToolbar />
        <CalendarTable className="bg-card" events={events} />
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
