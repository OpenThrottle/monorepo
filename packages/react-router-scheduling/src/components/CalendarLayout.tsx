import './CalendarLayout.css';

import {
  Button,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import {
  DEFAULT_VIEW,
  DEFAULT_VIEW_LABELS,
  DEFAULT_VIEWS,
} from '../config/defaults';
import { useCalendar } from '../hooks/useCalendar';
import { useSchedule } from '../hooks/useSchedule';
import { CalendarView } from '../types';
import type { CalendarEvent } from '../types';
import { Calendar } from './Calendar';
import type { CalendarSlots } from './slots';

export interface CalendarLayoutProps {
  /** Class applied to the layout root. */
  readonly className?: string;
  /** Initially selected date (defaults to today). */
  readonly defaultDate?: Date | string;
  /** Initially active view (defaults to the package default view). */
  readonly defaultView?: CalendarView;
  /**
   * Events to display. The schedule is seeded from this on mount; afterward,
   * passing a new array reference replaces the displayed events (the array
   * identity is the trigger, so memoize or hold it in state when loading async
   * data). For incremental changes, prefer `useSchedule` directly and call
   * `schedule.add` / `update` / `remove` / `set`.
   */
  readonly events?: CalendarEvent[];
  /** Calendar height as a CSS length (default `600px`). */
  readonly height?: string;
  /** Custom render slots (event cards, event modal, header content). */
  readonly slots?: CalendarSlots;
  /** Enabled views (defaults to week + month). */
  readonly views?: readonly CalendarView[];
}

// Stable empty default so an omitted `events` prop keeps the same array
// identity across renders (the events-sync effect diffs by reference).
const NO_EVENTS: CalendarEvent[] = [];

/**
 * @description Batteries-included scheduling surface: composes `useSchedule`,
 * `useCalendar`, a navigation/view toolbar (shadcn `Button` + `ToggleGroup`), and
 * the `<Calendar>` primitive. Drop in with just `events`. For custom layouts, use
 * `<Calendar>` and the hooks directly.
 *
 * @public
 */
export function CalendarLayout(props: CalendarLayoutProps): ReactElement {
  const {
    className,
    defaultDate,
    defaultView = DEFAULT_VIEW,
    events = NO_EVENTS,
    height = '600px',
    slots,
    views = DEFAULT_VIEWS,
  } = props;

  // Hooks
  const schedule = useSchedule({ defaultView, events, views });
  const calendar = useCalendar(schedule, { defaultDate, defaultView });
  // `useSchedule` seeds the event store from the first `events` value only
  // (the instance is created once and cached). Track that seed reference so a
  // later prop change replaces the events without recreating the instance
  // (which would reset view/selection state).
  const seededEvents = useRef(events);

  // Setup
  const dateLabel = calendar.date.toLocaleDateString(undefined, {
    dateStyle: 'medium',
  });

  // Handlers
  const handleViewChange = (value: string): void => {
    const match = views.find((view) => view === value);

    if (match !== undefined) {
      calendar.setView(match);
    }
  };

  // Markup

  // Life Cycle
  useEffect(() => {
    if (events === seededEvents.current) {
      return;
    }

    seededEvents.current = events;
    schedule.set(events);
  }, [events, schedule]);

  // 🔌 Short Circuit

  return (
    <div
      aria-label="Calendar"
      className={
        className ? `sx-scheduling-layout ${className}` : 'sx-scheduling-layout'
      }
      role="group"
    >
      <div className="sx-scheduling-toolbar flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-1">
          <Button
            aria-label="Previous period"
            onClick={calendar.prev}
            size="sm"
            type="button"
            variant="outline"
          >
            Previous
          </Button>
          <Button
            aria-label="Go to today"
            onClick={calendar.today}
            size="sm"
            type="button"
            variant="outline"
          >
            Today
          </Button>
          <Button
            aria-label="Next period"
            onClick={calendar.next}
            size="sm"
            type="button"
            variant="outline"
          >
            Next
          </Button>
          <span
            aria-live="polite"
            className="text-muted-foreground ml-2 text-sm"
          >
            {dateLabel}
          </span>
        </div>
        <ToggleGroup
          aria-label="Calendar view"
          onValueChange={handleViewChange}
          type="single"
          value={calendar.view}
        >
          {views.map((view) => (
            <ToggleGroupItem key={view} value={view}>
              {DEFAULT_VIEW_LABELS[view]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Calendar height={height} schedule={schedule} slots={slots} />
    </div>
  );
}
