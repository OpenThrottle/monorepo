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
import { ScheduleEventDetails } from '~/routing/schedule/components/ScheduleEventDetails';
import { SCHEDULE_EVENTS } from '~/routing/schedule/data/data.events';
import { SCHEDULE_NOT_FOUND_COPY } from '~/routing/schedule/data/data.copy';
import { getScheduleEventById } from '~/routing/schedule/utils/events';
import { SITE_TITLE } from '~/global/config/settings';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { Route } from '@/app/routes/+types/schedule.$eventId';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => (
    <OpenThrottleClipboard
      className="cursor-pointer whitespace-nowrap"
      label={match.params.eventId}
      text={match.params.eventId ?? 'not-found'}
    />
  ),
  links: (_match) => [{ children: 'Schedule', to: '/schedule' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const eventId = args.params.eventId;
  const event = getScheduleEventById(SCHEDULE_EVENTS, eventId ?? '');

  return { event };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Event Details | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const { event } = loaderData;

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
          <EmptyTitle>{SCHEDULE_NOT_FOUND_COPY.title}</EmptyTitle>
          <EmptyDescription>
            {SCHEDULE_NOT_FOUND_COPY.description}
          </EmptyDescription>
          <Button asChild={true} variant="secondary">
            <Link to="/schedule">Back to schedule</Link>
          </Button>
        </Empty>
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen beta={true}>
      <ScheduleEventDetails event={event} />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
