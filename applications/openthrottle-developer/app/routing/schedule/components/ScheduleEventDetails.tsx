import * as React from 'react';
import classnames from 'classnames';
import { CalendarClockIcon, MapPinIcon } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { formatScheduleRange } from '~/routing/schedule/utils/formatters';
import type { ScheduleEvent } from '~/routing/schedule/types';

export interface ScheduleEventDetailsProps {
  className?: string;
  event: ScheduleEvent;
}

export const ScheduleEventDetails = (
  props: ScheduleEventDetailsProps,
): React.ReactElement => {
  const { className, event } = props;

  // Hooks

  // Setup
  const when = formatScheduleRange(event.startsAt, event.endsAt, event.allDay);
  const location = event.location.trim();

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames('w-full', className)}
      data-testid="ScheduleEventDetails"
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
