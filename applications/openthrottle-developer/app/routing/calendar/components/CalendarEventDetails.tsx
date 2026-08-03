import * as React from 'react';
import clsx from 'clsx';
import { CalendarClockIcon, MapPinIcon } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { formatCalendarRange } from '~/routing/calendar/utils/formatters';
import type { CalendarListEvent } from '~/routing/calendar/types';

export interface CalendarEventDetailsProps {
  className?: string;
  event: CalendarListEvent;
}

export const CalendarEventDetails = (
  props: CalendarEventDetailsProps,
): React.ReactElement => {
  const { className, event } = props;

  // Hooks

  // Setup
  const when = formatCalendarRange(event.startsAt, event.endsAt, event.allDay);
  const location = event.location.trim();

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={clsx('w-full', className)}
      data-testid="CalendarEventDetails"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {event.title}
          {event.allDay ? <Badge variant="secondary">All day</Badge> : null}
        </CardTitle>
        <CardDescription>{event.description}</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <CalendarClockIcon className="size-4" />
          <span aria-label={`When: ${when}`}>{when}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPinIcon className="size-4" />
          <span aria-label={`Location: ${location || 'None'}`}>
            {location || '—'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
