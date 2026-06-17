import { useCallback, useState } from 'react';
import { DEFAULT_VIEW } from '../config/defaults';
import { CalendarView } from '../types';
import { temporalToDate, toPlainDate } from '../utils/datetime';
import { toEngineViewName } from '../utils/views';
import type { UseScheduleResult } from './useSchedule';

// useCalendar is a thin view/navigation lens over a schedule. It does NOT own
// events (those live in useSchedule); it reads the schedule's calendar-controls
// plugin to drive the rendered view and selected date, mirroring that engine
// state into React state so a toolbar can render from it.

type EnginePlainDate = ReturnType<typeof toPlainDate>;

/** Options for {@link useCalendar}. */
export interface UseCalendarOptions {
  /** Initially selected date (defaults to today). */
  defaultDate?: Date | string;
  /** Initially active view (defaults to the package default view). */
  defaultView?: CalendarView;
}

/**
 * A calendar view onto a schedule: the active view and selected date plus the
 * controls to change them.
 *
 * @publicApi
 */
export interface UseCalendarResult {
  /** Currently selected date. */
  date: Date;
  /** Advance one view-sized step (day/week/month). */
  next: () => void;
  /** Go back one view-sized step (day/week/month). */
  prev: () => void;
  /** Jump to a specific date. */
  setDate: (date: Date | string) => void;
  /** Switch the active view. */
  setView: (view: CalendarView) => void;
  /** Jump to today. */
  today: () => void;
  /** Currently active view. */
  view: CalendarView;
}

function shiftDate(
  date: EnginePlainDate,
  view: CalendarView,
  direction: 1 | -1,
): EnginePlainDate {
  if (view === CalendarView.Day) {
    return date.add({ days: direction });
  }
  if (view === CalendarView.Month) {
    return date.add({ months: direction });
  }
  return date.add({ weeks: direction });
}

function normalizeDate(value: Date | string | undefined): Date {
  if (value === undefined) {
    return new Date();
  }
  return value instanceof Date ? value : new Date(value);
}

/**
 * Create a calendar view onto a {@link UseScheduleResult}: the active view and
 * selected date, plus `setView`/`setDate`/`next`/`prev`/`today` driven through
 * the schedule's calendar-controls plugin.
 *
 * @publicApi
 */
export function useCalendar(
  schedule: UseScheduleResult,
  options: UseCalendarOptions = {},
): UseCalendarResult {
  const controls = schedule.plugins.calendarControls;
  const [view, setViewState] = useState<CalendarView>(
    options.defaultView ?? DEFAULT_VIEW,
  );
  const [date, setDateState] = useState<Date>(() =>
    normalizeDate(options.defaultDate),
  );

  const setView = useCallback(
    (next: CalendarView) => {
      setViewState(next);
      controls?.setView(toEngineViewName(next));
    },
    [controls],
  );

  const setDate = useCallback(
    (next: Date | string) => {
      const normalized = normalizeDate(next);
      setDateState(normalized);
      controls?.setDate(toPlainDate(normalized));
    },
    [controls],
  );

  const today = useCallback(() => {
    setDate(new Date());
  }, [setDate]);

  const step = useCallback(
    (direction: 1 | -1) => {
      setDateState((current) => {
        const shifted = shiftDate(toPlainDate(current), view, direction);
        controls?.setDate(shifted);
        return temporalToDate(shifted);
      });
    },
    [controls, view],
  );

  const next = useCallback(() => {
    step(1);
  }, [step]);
  const prev = useCallback(() => {
    step(-1);
  }, [step]);

  return { date, next, prev, setDate, setView, today, view };
}
