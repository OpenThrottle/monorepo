import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_VIEW } from '../config/defaults';
import { CalendarView } from '../types';
import { temporalToDate, toPlainDate } from '../utils/datetime';
import { fromEngineViewName, toEngineViewName } from '../utils/views';
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
 * @public
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
 * @public
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

  // Mirror engine-driven view/date changes back into React state. Schedule-X can
  // navigate itself (its own header controls, date-picker, drag navigation)
  // without going through `setView`/`setDate`, which would otherwise leave the
  // toolbar showing a stale view/date. Subscribe to the engine's reactive
  // signals and write the React state directly (NOT via `setView`/`setDate`,
  // which push back into the engine and would loop). The first emission is the
  // signal's current value, fired synchronously on subscribe — skip it so the
  // engine's seed (e.g. "today") never clobbers this hook's `defaultDate`.
  useEffect(() => {
    const app = controls?.$app;
    if (app === undefined) {
      return;
    }

    let primedView = false;
    let primedDate = false;

    const unsubscribeView = app.calendarState.view.subscribe((name) => {
      if (!primedView) {
        primedView = true;
        return;
      }
      setViewState(fromEngineViewName(name));
    });
    const unsubscribeDate = app.datePickerState.selectedDate.subscribe(
      (plainDate) => {
        if (!primedDate) {
          primedDate = true;
          return;
        }
        setDateState(temporalToDate(plainDate));
      },
    );

    return () => {
      unsubscribeView();
      unsubscribeDate();
    };
  }, [controls]);

  return { date, next, prev, setDate, setView, today, view };
}
