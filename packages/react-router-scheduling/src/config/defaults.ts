import type { CalendarEvent, SchedulePluginsConfig } from '../types';
import type { CalendarViewValue } from '../types';
import { CALENDAR_VIEW } from '../types';

/**
 * Stable empty default for an omitted `events` prop, so the array identity is
 * the same across renders (the events-sync effect diffs by reference).
 * @public
 */
export const CALENDAR_LAYOUT_DEFAULT_EVENTS: CalendarEvent[] = [];

/**
 * Default enabled views: week and month (in toolbar order).
 * @public
 */
export const DEFAULT_VIEWS: readonly CalendarViewValue[] = [
  CALENDAR_VIEW.Week,
  CALENDAR_VIEW.Month,
];

/**
 * Default view labels.
 * @public
 */
export const DEFAULT_VIEW_LABELS: Record<CalendarViewValue, string> = {
  [CALENDAR_VIEW.Day]: 'Day',
  [CALENDAR_VIEW.Month]: 'Month',
  [CALENDAR_VIEW.Week]: 'Week',
};

/**
 * Default view applied when none is specified.
 * @public
 */
export const DEFAULT_VIEW: CalendarViewValue = CALENDAR_VIEW.Week;

/**
 * Default plugin set: reactive event CRUD plus drag-and-drop, resize,
 * navigation controls, the current-time indicator, recurring-event expansion,
 * and the click-to-open event modal.
 * @public
 */
export const DEFAULT_PLUGINS: Required<SchedulePluginsConfig> = {
  calendarControls: true,
  currentTime: true,
  dragAndDrop: true,
  eventModal: true,
  eventsService: true,
  recurrence: true,
  resize: true,
};
