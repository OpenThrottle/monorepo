import '../utils/temporal-bootstrap';

import { useRef } from 'react';

import type { CalendarEvent, ScheduleConfig, ScheduleInstance } from '../types';
import { createSchedule } from '../utils/create-schedule';
import type { SchedulingPlugins } from '../utils/plugins';

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
