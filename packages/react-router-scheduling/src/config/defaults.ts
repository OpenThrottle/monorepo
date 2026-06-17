import { CalendarView } from '../types';
import type { SchedulePluginsConfig } from '../types';

/**
 * Default enabled views: week and month (in toolbar order).
 * @publicApi
 */
export const DEFAULT_VIEWS: readonly CalendarView[] = [
  CalendarView.Week,
  CalendarView.Month,
];

/**
 * Default view labels.
 * @publicApi
 */
export const DEFAULT_VIEW_LABELS: Record<CalendarView, string> = {
  [CalendarView.Day]: 'Day',
  [CalendarView.Month]: 'Month',
  [CalendarView.Week]: 'Week',
};

/**
 * Default view applied when none is specified.
 * @publicApi
 */
export const DEFAULT_VIEW: CalendarView = CalendarView.Week;

/**
 * Default plugin set: reactive event CRUD plus drag-and-drop, resize,
 * navigation controls, the current-time indicator, recurring-event expansion,
 * and the click-to-open event modal.
 * @publicApi
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
