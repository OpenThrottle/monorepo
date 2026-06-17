import type { CalendarEventSlotProps } from '@openthrottle/react-router-scheduling';
import type { ReactElement } from 'react';

/**
 * @description Custom time-grid event card for the scheduling-calendar demo,
 * passed as the package's `timeGridEvent` slot. Demonstrates that a slot
 * receives the event as a domain CalendarEvent (no Schedule-X / Temporal types).
 */
export function ScheduleEventCard(props: CalendarEventSlotProps): ReactElement {
  const { calendarEvent } = props;

  // Hooks

  // Setup
  const startLabel = new Date(calendarEvent.start).toLocaleTimeString(
    undefined,
    { hour: '2-digit', minute: '2-digit' },
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="bg-primary/15 text-primary-foreground border-primary/40 h-full overflow-hidden rounded border-l-2 px-1 py-0.5">
      <p className="text-foreground truncate text-xs font-semibold">
        {calendarEvent.title}
      </p>
      <p className="text-muted-foreground truncate text-[10px]">
        {startLabel}
        {calendarEvent.location ? ` · ${calendarEvent.location}` : ''}
      </p>
    </div>
  );
}
