import { viewDay, viewMonthGrid, viewWeek } from '@schedule-x/calendar';

import { DEFAULT_VIEW, DEFAULT_VIEWS } from '../config/defaults';
import type { CalendarViewValue } from '../types';
import { CALENDAR_VIEW } from '../types';

// Maps engine-agnostic CalendarView values to concrete Schedule-X view objects
// (for createCalendar) and view names (for calendar-controls), and back. This is
// where the neutral `day`/`week`/`month` vocabulary meets the engine's
// `day`/`week`/`month-grid` view set.

type EngineView = typeof viewWeek;

const VIEW_OBJECTS: Record<CalendarViewValue, EngineView> = {
  [CALENDAR_VIEW.Day]: viewDay,
  [CALENDAR_VIEW.Month]: viewMonthGrid,
  [CALENDAR_VIEW.Week]: viewWeek,
};

const ENGINE_NAME_TO_VIEW: Record<string, CalendarViewValue> = {
  [viewDay.name]: CALENDAR_VIEW.Day,
  [viewMonthGrid.name]: CALENDAR_VIEW.Month,
  [viewWeek.name]: CALENDAR_VIEW.Week,
};

/**
 * Resolve a {@link CALENDAR_VIEW} to its Schedule-X view object.
 *
 * @public
 */
export function toEngineView(view: CalendarViewValue): EngineView {
  return VIEW_OBJECTS[view];
}

/**
 * The Schedule-X view name (e.g. `month-grid`) for a {@link CALENDAR_VIEW}, as
 * used by the calendar-controls `setView`.
 *
 * @public
 */
export function toEngineViewName(view: CalendarViewValue): string {
  return VIEW_OBJECTS[view].name;
}

/**
 * Map a Schedule-X view name back to a {@link CALENDAR_VIEW} (falls back to the
 * default view for an unknown name).
 *
 * @public
 */
export function fromEngineViewName(name: string): CalendarViewValue {
  return ENGINE_NAME_TO_VIEW[name] ?? DEFAULT_VIEW;
}

const orderViews = (
  views: readonly CalendarViewValue[],
  defaultView: CalendarViewValue | undefined,
): CalendarViewValue[] => {
  if (defaultView === undefined) {
    return [...views];
  }

  return [defaultView, ...views.filter((v) => v !== defaultView)];
};

/**
 * Resolve the enabled {@link CALENDAR_VIEW}s into the non-empty Schedule-X view
 * tuple `createCalendar` requires, putting `defaultView` first when provided.
 *
 * @public
 */
export function resolveViews(
  views: readonly CalendarViewValue[] = DEFAULT_VIEWS,
  defaultView?: CalendarViewValue,
): [EngineView, ...EngineView[]] {
  const ordered = orderViews(views, defaultView);

  const resolved = ordered.map(toEngineView);
  const first = resolved[0] ?? toEngineView(DEFAULT_VIEW);

  return [first, ...resolved.slice(1)];
}
