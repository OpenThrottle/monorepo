import { CalendarView } from '../types';
import type { CalendarEvent, SchedulePluginsConfig } from '../types';

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
export const DEFAULT_VIEWS: readonly CalendarView[] = [
  CalendarView.Week,
  CalendarView.Month,
];

/**
 * Default view labels.
 * @public
 */
export const DEFAULT_VIEW_LABELS: Record<CalendarView, string> = {
  [CalendarView.Day]: 'Day',
  [CalendarView.Month]: 'Month',
  [CalendarView.Week]: 'Week',
};

/**
 * Default view applied when none is specified.
 * @public
 */
export const DEFAULT_VIEW: CalendarView = CalendarView.Week;

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
