import './CalendarLayout.css';

import {
  Button,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import type { ReactElement } from 'react';
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
  /** Events to display. */
  readonly events?: CalendarEvent[];
  /** Calendar height as a CSS length (default `600px`). */
  readonly height?: string;
  /** Custom render slots (event cards, event modal, header content). */
  readonly slots?: CalendarSlots;
  /** Enabled views (defaults to week + month). */
  readonly views?: readonly CalendarView[];
}

/**
 * @description Batteries-included scheduling surface: composes `useSchedule`,
 * `useCalendar`, a navigation/view toolbar (shadcn `Button` + `ToggleGroup`), and
 * the `<Calendar>` primitive. Drop in with just `events`. For custom layouts, use
 * `<Calendar>` and the hooks directly.
 *
 * @publicApi
 */
export function CalendarLayout(props: CalendarLayoutProps): ReactElement {
  const {
    className,
    defaultDate,
    defaultView = DEFAULT_VIEW,
    events = [],
    height = '600px',
    slots,
    views = DEFAULT_VIEWS,
  } = props;

  // Hooks
  const schedule = useSchedule({ defaultView, events, views });
  const calendar = useCalendar(schedule, { defaultDate, defaultView });

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

  // 🔌 Short Circuit

  return (
    <div
      className={
        className ? `sx-scheduling-layout ${className}` : 'sx-scheduling-layout'
      }
    >
      <div className="sx-scheduling-toolbar flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-1">
          <Button
            onClick={calendar.prev}
            size="sm"
            type="button"
            variant="outline"
          >
            Previous
          </Button>
          <Button
            onClick={calendar.today}
            size="sm"
            type="button"
            variant="outline"
          >
            Today
          </Button>
          <Button
            onClick={calendar.next}
            size="sm"
            type="button"
            variant="outline"
          >
            Next
          </Button>
          <span className="text-muted-foreground ml-2 text-sm">
            {dateLabel}
          </span>
        </div>
        <ToggleGroup
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
