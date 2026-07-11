import '../utils/temporal-bootstrap';

import { createCalendar } from '@schedule-x/calendar';
import { createSchedulingPlugins } from '../utils/plugins';
import { DEFAULT_VIEW } from '../config/defaults';
import { fromEngineEvent, toEngineEvent } from '../utils/events';
import { isHostDark } from '../utils/dark-mode';
import { toEngineCallbacks } from '../utils/callbacks';
import { resolveViews } from '../utils/views';
import { toPlainDate } from '../utils/datetime';
import { useRef } from 'react';
import type { CalendarEvent, ScheduleConfig } from '../types';
import type { SchedulingPlugins } from '../utils/plugins';

/** The Schedule-X app instance backing a schedule. */
export type ScheduleInstance = ReturnType<typeof createCalendar>;

/**
 * A schedule: the underlying Schedule-X instance plus engine-agnostic event CRUD
 * (all values in {@link CalendarEvent} shape, adapters applied internally). The
 * `instance` is the source of truth handed to `useCalendar` and `<Calendar>`.
 *
 * @public
 */
export interface UseScheduleResult {
  /** Add a single event. */
  add: (event: CalendarEvent) => void;
  /** All events currently in the schedule. */
  all: () => CalendarEvent[];
  /** Look up a single event by id. */
  getById: (id: string) => CalendarEvent | undefined;
  /** The Schedule-X app instance (for `<Calendar>` / `useCalendar`). */
  instance: ScheduleInstance;
  /** The plugin instances wired into the schedule. */
  plugins: SchedulingPlugins;
  /** Remove an event by id. */
  remove: (id: string) => void;
  /** Replace all events. */
  set: (events: CalendarEvent[]) => void;
  /** Update an existing event (matched by id). */
  update: (event: CalendarEvent) => void;
}

function createSchedule(config: ScheduleConfig): UseScheduleResult {
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

/**
 * Create and own a schedule — a Schedule-X app instance plus engine-agnostic
 * event CRUD. The instance is created once for the lifetime of the component and
 * can be used with no calendar view (e.g. an agenda list) or handed to
 * `useCalendar` / `<Calendar>` for a calendar surface.
 *
 * `config` is read **once**, when the instance is created: `events`, `views`,
 * `defaultView`, and `date` are seed values, and later changes to `config` are
 * ignored (keeping the instance — and thus view/selection state — stable across
 * renders). Mutate events through the returned `add` / `update` / `remove` /
 * `set` instead. `<CalendarLayout>` adds a prop-diffing effect on top so its
 * `events` prop can be replaced after mount.
 *
 * @public
 */
export function useSchedule(config: ScheduleConfig = {}): UseScheduleResult {
  // const {} = config;

  // Hooks
  const ref = useRef<UseScheduleResult | null>(null);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (ref.current === null) {
    ref.current = createSchedule(config);
  }

  return ref.current;
}
