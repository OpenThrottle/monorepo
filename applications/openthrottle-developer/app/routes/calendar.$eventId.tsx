import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { CalendarSearchIcon } from 'lucide-react';
import { CalendarEventDetails } from '~/routing/calendar/components/CalendarEventDetails';
import { CALENDAR_EVENTS } from '~/routing/calendar/data/data.events';
import { CALENDAR_NOT_FOUND_COPY } from '~/routing/calendar/data/data.copy';
import { getCalendarEventById } from '~/routing/calendar/utils/events';
import { SITE_TITLE } from '~/global/config/settings';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { Route } from '@/app/routes/+types/calendar.$eventId';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="cursor-pointer whitespace-nowrap"
      label={match.params.eventId}
      text={match.params.eventId ?? 'not-found'}
    />
  ),
  links: (_match) => [{ children: 'Calendar', to: '/calendar' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const eventId = args.params.eventId;
  const event = getCalendarEventById(CALENDAR_EVENTS, eventId ?? '');

  return { event };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const event = args.loaderData?.event;
  const title = event?.title
    ? `${event.title} | Calendar | ${SITE_TITLE}`
    : `Event | Calendar | ${SITE_TITLE}`;

  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { event } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!event) {
    return (
      <GlobalScreen beta={true}>
        <Empty className="my-8">
          <EmptyMedia variant="icon">
            <CalendarSearchIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle>{CALENDAR_NOT_FOUND_COPY.title}</EmptyTitle>
          <EmptyDescription>
            {CALENDAR_NOT_FOUND_COPY.description}
          </EmptyDescription>
          <Button asChild={true} variant="secondary">
            <Link to="/calendar/list">Back to calendar</Link>
          </Button>
        </Empty>
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen beta={true}>
      <CalendarEventDetails event={event} />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
