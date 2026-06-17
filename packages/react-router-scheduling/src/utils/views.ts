import { viewDay, viewMonthGrid, viewWeek } from '@schedule-x/calendar';

import { DEFAULT_VIEW, DEFAULT_VIEWS } from '../config/defaults';
import { CalendarView } from '../types';

// Maps engine-agnostic CalendarView values to concrete Schedule-X view objects
// (for createCalendar) and view names (for calendar-controls), and back. This is
// where the neutral `day`/`week`/`month` vocabulary meets the engine's
// `day`/`week`/`month-grid` view set.

type EngineView = typeof viewWeek;

const VIEW_OBJECTS: Record<CalendarView, EngineView> = {
  [CalendarView.Day]: viewDay,
  [CalendarView.Month]: viewMonthGrid,
  [CalendarView.Week]: viewWeek,
};

const ENGINE_NAME_TO_VIEW: Record<string, CalendarView> = {
  [viewDay.name]: CalendarView.Day,
  [viewMonthGrid.name]: CalendarView.Month,
  [viewWeek.name]: CalendarView.Week,
};

/**
 * Resolve a {@link CalendarView} to its Schedule-X view object.
 *
 * @publicApi
 */
export function toEngineView(view: CalendarView): EngineView {
  return VIEW_OBJECTS[view];
}

/**
 * The Schedule-X view name (e.g. `month-grid`) for a {@link CalendarView}, as
 * used by the calendar-controls `setView`.
 *
 * @publicApi
 */
export function toEngineViewName(view: CalendarView): string {
  return VIEW_OBJECTS[view].name;
}

/**
 * Map a Schedule-X view name back to a {@link CalendarView} (falls back to the
 * default view for an unknown name).
 *
 * @publicApi
 */
export function fromEngineViewName(name: string): CalendarView {
  return ENGINE_NAME_TO_VIEW[name] ?? DEFAULT_VIEW;
}

/**
 * Resolve the enabled {@link CalendarView}s into the non-empty Schedule-X view
 * tuple `createCalendar` requires, putting `defaultView` first when provided.
 *
 * @publicApi
 */
export function resolveViews(
  views: readonly CalendarView[] = DEFAULT_VIEWS,
  defaultView?: CalendarView,
): [EngineView, ...EngineView[]] {
  const ordered =
    defaultView !== undefined
      ? [defaultView, ...views.filter((v) => v !== defaultView)]
      : [...views];

  const resolved = ordered.map(toEngineView);
  const first = resolved[0] ?? toEngineView(DEFAULT_VIEW);

  return [first, ...resolved.slice(1)];
}
