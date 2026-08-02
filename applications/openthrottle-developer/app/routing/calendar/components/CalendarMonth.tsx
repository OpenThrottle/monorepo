import * as React from 'react';
import {
  Calendar,
  CalendarView,
  useCalendarSelection,
  useSchedule,
} from '@openthrottle/react-router-scheduling';
import { Button } from '@openthrottle/react-router-shadcn';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { CalendarEventCard } from './CalendarEventCard';
import type { CalendarEvent } from '@openthrottle/react-router-scheduling';

export interface CalendarMonthProps {
  readonly className?: string;
  readonly events: CalendarEvent[];
}

/**
 * Calendar view of the schedule, backed by the @openthrottle/react-router-scheduling
 * package (Schedule-X under the hood). Composes the primitives — `useSchedule`
 * (recurring events + the custom event card slot), `useCalendarSelection`
 * (click an empty slot to create), and `<Calendar>` — so it exercises recurrence,
 * slots, and interactions together.
 */
export const CalendarMonth = (
  props: CalendarMonthProps,
): React.ReactElement | null => {
  const { className, events } = props;

  // Hooks
  const createdCount = React.useRef(0);
  const selection = useCalendarSelection();
  const schedule = useSchedule({
    callbacks: selection.callbacks,
    date: new Date(), // Browser only so we get the TZ for free
    defaultView: CalendarView.Week,
    events,
    views: [CalendarView.Day, CalendarView.Week, CalendarView.Month],
  });

  // Setup
  const pending = selection.selection.dateTime;

  // Handlers
  const handleCreate = (): void => {
    if (pending === undefined) return;

    createdCount.current += 1;

    const start = new Date(pending);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    schedule.add({
      end: end.toISOString(),
      id: `created-${createdCount.current}`,
      start: start.toISOString(),
      title: 'New event',
    });

    selection.clear();
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!IS_BROWSER) {
    return null;
  }

  return (
    <div className={className}>
      <div className="mb-2 flex min-h-9 items-center gap-2">
        {pending ? (
          <>
            <span className="text-sm">
              Create an event at {new Date(pending).toLocaleString()}?
            </span>
            <Button onClick={handleCreate} size="sm" type="button">
              Add event
            </Button>
            <Button
              onClick={selection.clear}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">
            Click an empty time slot to create an event.
          </span>
        )}
      </div>
      <div className="overflow relative overflow-clip">
        <Calendar
          className="z-10"
          height="100%"
          schedule={schedule}
          slots={{ timeGridEvent: CalendarEventCard }}
        />
      </div>
    </div>
  );
};
