import { useCallback, useRef, useState } from 'react';
import type { CalendarEvent, ScheduleCallbacks } from '../types';

// An ergonomic selection layer over the engine-agnostic interaction callbacks.
// It tracks the most recent click (an empty time slot, a month-grid day, or an
// existing event) as domain values and hands back the `callbacks` to spread into
// useSchedule's config — so a consumer can build click-to-create and
// event-selection UIs without touching the engine.
//
// Note: true drag-to-create (dragging across the grid to create an event) is the
// premium `@sx-premium/drag-to-create` plugin and is intentionally out of scope;
// this hook covers the open-source click path.

/**
 * The most recent calendar selection, in engine-agnostic shape. Each field is
 * set by the corresponding click and persists until the next click or `clear`.
 *
 * @public
 */
export interface CalendarSelection {
  /** Last clicked month-grid day (`YYYY-MM-DD`). */
  date?: string;
  /** Last clicked empty time-grid slot (ISO 8601). */
  dateTime?: string;
  /** Last clicked existing event. */
  event?: CalendarEvent;
}

/**
 * Options for {@link useCalendarSelection}. Each handler fires after the
 * matching click, alongside the internal selection update.
 *
 * @public
 */
export interface UseCalendarSelectionOptions {
  /** Fired when a month-grid day is clicked (`YYYY-MM-DD`). */
  onSelectDate?: (date: string) => void;
  /** Fired when an empty time-grid slot is clicked (ISO 8601). */
  onSelectDateTime?: (dateTime: string) => void;
  /** Fired when an existing event is clicked. */
  onSelectEvent?: (event: CalendarEvent) => void;
}

/**
 * Result of {@link useCalendarSelection}: the current {@link CalendarSelection},
 * a `clear` to reset it, and the `callbacks` to spread into `useSchedule`.
 *
 * @public
 */
export interface UseCalendarSelectionResult {
  /** Spread into `useSchedule({ callbacks })` to wire selection. */
  callbacks: ScheduleCallbacks;
  /** Reset the selection to empty. */
  clear: () => void;
  /** The current selection. */
  selection: CalendarSelection;
}

/**
 * Track the most recent calendar click (empty slot / day / event) as domain
 * values, for building click-to-create and event-selection UIs. Spread the
 * returned `callbacks` into `useSchedule`:
 *
 * ```tsx
 * const selection = useCalendarSelection({ onSelectDateTime: openCreateDialog });
 * const schedule = useSchedule({ events, callbacks: selection.callbacks });
 * ```
 *
 * @public
 */
export function useCalendarSelection(
  options: UseCalendarSelectionOptions = {},
): UseCalendarSelectionResult {
  // Hooks
  const [selection, setSelection] = useState<CalendarSelection>({});
  const optionsRef = useRef<UseCalendarSelectionOptions>(options);
  const callbacksRef = useRef<ScheduleCallbacks | null>(null);

  // Setup
  // Keep the latest handlers reachable from the stable callbacks created below
  // (useSchedule captures `callbacks` once when it builds the engine instance).
  optionsRef.current = options;

  // Handlers
  if (callbacksRef.current === null) {
    callbacksRef.current = {
      onClickDate: (date) => {
        setSelection((prev) => ({ ...prev, date }));
        optionsRef.current.onSelectDate?.(date);
      },
      onClickDateTime: (dateTime) => {
        setSelection((prev) => ({ ...prev, dateTime }));
        optionsRef.current.onSelectDateTime?.(dateTime);
      },
      onEventClick: (event) => {
        setSelection((prev) => ({ ...prev, event }));
        optionsRef.current.onSelectEvent?.(event);
      },
    };
  }

  const clear = useCallback((): void => {
    setSelection({});
  }, []);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return { callbacks: callbacksRef.current, clear, selection };
}
