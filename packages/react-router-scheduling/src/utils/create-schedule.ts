import './temporal-bootstrap';

import { createCalendar } from '@schedule-x/calendar';

import { DEFAULT_VIEW } from '../config/defaults';
import type { UseScheduleResult } from '../hooks/useSchedule';
import type { ScheduleConfig } from '../types';
import { toEngineCallbacks } from './callbacks';
import { isHostDark } from './dark-mode';
import { toPlainDate } from './datetime';
import { fromEngineEvent, toEngineEvent } from './events';
import { createSchedulingPlugins } from './plugins';
import { resolveViews } from './views';

/**
 * Build the Schedule-X instance, plugin set and engine-agnostic event CRUD that
 * `useSchedule` hands back. Called once per `useSchedule` mount.
 */
export function createSchedule(config: ScheduleConfig): UseScheduleResult {
  // events-service is the event store; force it on regardless of config so CRUD
  // always works (a schedule without an event store is meaningless).
  const plugins = createSchedulingPlugins({
    ...config.plugins,
    eventsService: true,
  });
  const eventsService = plugins.eventsService;

  if (eventsService === undefined) {
    throw new Error('useSchedule could not create the events-service plugin.');
  }

  const events = (config.events ?? []).map(toEngineEvent);
  const callbacks = toEngineCallbacks(config.callbacks);
  const instance = createCalendar(
    {
      callbacks,
      events,
      isDark: isHostDark(),
      selectedDate:
        config.date !== undefined ? toPlainDate(config.date) : undefined,
      theme: 'shadcn',
      views: resolveViews(config.views, config.defaultView ?? DEFAULT_VIEW),
    },
    plugins.list,
  );

  // Populate the event store explicitly so the schedule is usable standalone,
  // with no calendar view rendered (agenda list / next-event widget).
  eventsService.set(events);

  return {
    add: (event) => eventsService.add(toEngineEvent(event)),
    all: () => eventsService.getAll().map(fromEngineEvent),
    getById: (id) => {
      const found = eventsService.get(id);
      return found !== undefined ? fromEngineEvent(found) : undefined;
    },
    instance,
    plugins,
    remove: (id) => eventsService.remove(id),
    set: (next) => eventsService.set(next.map(toEngineEvent)),
    update: (event) => eventsService.update(toEngineEvent(event)),
  };
}
