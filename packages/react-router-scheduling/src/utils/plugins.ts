import type { PluginBase } from '@schedule-x/calendar';
import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls';
import { createCurrentTimePlugin } from '@schedule-x/current-time';
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop';
import { createEventModalPlugin } from '@schedule-x/event-modal';
import { createEventRecurrencePlugin } from '@schedule-x/event-recurrence';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import { createResizePlugin } from '@schedule-x/resize';

import { DEFAULT_PLUGINS } from '../config/defaults';
import type { SchedulePluginsConfig } from '../types';

// The single place Schedule-X plugin wiring lives: it turns the engine-agnostic
// SchedulePluginsConfig flags into concrete plugin instances. The events-service
// and calendar-controls instances are surfaced as named handles because the
// hooks build on them — useSchedule drives event CRUD through events-service and
// useCalendar drives view/navigation through calendar-controls.

/** Type of the events-service plugin instance (event CRUD store). */
export type EventsServicePlugin = ReturnType<typeof createEventsServicePlugin>;

/** Type of the calendar-controls plugin instance (view/date navigation). */
export type CalendarControlsPlugin = ReturnType<
  typeof createCalendarControlsPlugin
>;

/**
 * The plugin instances created for a schedule: the full `list` to hand to
 * Schedule-X's `createCalendar`, plus typed handles to the two plugins the hooks
 * depend on (present only when their flag is enabled).
 *
 * @public
 */
export interface SchedulingPlugins {
  calendarControls?: CalendarControlsPlugin;
  eventsService?: EventsServicePlugin;
  list: PluginBase<string>[];
}

/**
 * Build the Schedule-X plugin set for v1 from the given feature flags (defaults
 * to {@link DEFAULT_PLUGINS} — all enabled). Returns the plugin `list` for
 * `createCalendar` plus handles to the events-service and calendar-controls
 * instances.
 *
 * @public
 */
export function createSchedulingPlugins(
  config: SchedulePluginsConfig = {},
): SchedulingPlugins {
  const flags = { ...DEFAULT_PLUGINS, ...config };
  const list: PluginBase<string>[] = [];
  const result: SchedulingPlugins = { list };

  if (flags.eventsService) {
    const eventsService = createEventsServicePlugin();

    result.eventsService = eventsService;
    list.push(eventsService);
  }

  if (flags.calendarControls) {
    const calendarControls = createCalendarControlsPlugin();

    result.calendarControls = calendarControls;
    list.push(calendarControls);
  }

  if (flags.dragAndDrop) {
    list.push(createDragAndDropPlugin());
  }

  if (flags.resize) {
    list.push(createResizePlugin());
  }

  if (flags.currentTime) {
    list.push(createCurrentTimePlugin());
  }

  if (flags.eventModal) {
    list.push(createEventModalPlugin());
  }

  /**
   * No hook handle to surface — recurrence is driven entirely by each event's
   * rrule/exdate (mapped in the event adapters), so the plugin just expands the
   * series at render time.
   */
  if (flags.recurrence) {
    list.push(createEventRecurrencePlugin());
  }

  return result;
}
