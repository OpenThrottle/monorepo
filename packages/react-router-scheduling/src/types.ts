/**
 * Engine-agnostic public types for @openthrottle/react-router-scheduling.
 *
 * The Schedule-X engine models datetimes with the Temporal API; these types
 * intentionally do not leak it. The datetime helpers and event adapters (see
 * `utils/`) bridge between this domain shape and the engine shape so the engine
 * stays swappable behind the `index.ts` barrel.
 */

/**
 * A recurring-event rule, wrapping a raw RFC 5545 RRULE string. The structured
 * wrapper (rather than a bare `string`) keeps the public shape forward-compatible
 * — the `buildRRule`/`parseRRule` helpers produce and consume it, and it can grow
 * fields without a breaking change.
 *
 * The Schedule-X `event-recurrence` engine implements a SUBSET of RFC 5545:
 * `FREQ` (`DAILY`/`WEEKLY`/`MONTHLY`/`YEARLY`) plus the `COUNT`, `INTERVAL`,
 * `UNTIL`, `BYDAY`, `BYMONTHDAY`, and `WKST` modifiers. Caveat: `BYDAY` combined
 * with `MONTHLY`/`YEARLY` renders correctly but such events cannot be rescheduled
 * by drag-and-drop.
 *
 * @public
 */
export interface RecurrenceRule {
  /** Raw RFC 5545 RRULE string, e.g. `FREQ=WEEKLY;BYDAY=MO`. */
  rule: string;
}

/**
 * A single event on a schedule, in an engine-agnostic shape. `start`/`end`
 * accept a `Date` or an ISO 8601 string; the event adapters normalize them to
 * the engine's datetime representation.
 *
 * @public
 */
export interface CalendarEvent {
  /** Marks an all-day event (date-only, no time component). */
  allDay?: boolean;
  /** Id of the calendar this event belongs to (used for grouping/coloring). */
  calendarId?: string;
  /** Free-form event description. */
  description?: string;
  /** Event end, as a `Date` or ISO 8601 string. */
  end: Date | string;
  /**
   * Dates to exclude from a recurring series (RFC 5545 `EXDATE`), each a `Date`
   * or ISO 8601 string. Ignored when {@link CalendarEvent.rrule} is unset.
   */
  exdate?: (Date | string)[];
  /** Stable unique identifier. */
  id: string;
  /** Human-readable location. */
  location?: string;
  /** People/attendees associated with the event. */
  people?: string[];
  /** Recurrence rule; makes this the seed of a recurring series. */
  rrule?: RecurrenceRule;
  /** Event start, as a `Date` or ISO 8601 string. */
  start: Date | string;
  /** Event title shown in the calendar. */
  title: string;
}

/**
 * Calendar view styles. Engine-neutral values (`day`/`week`/`month`) mapped to
 * concrete Schedule-X views in the view/plugin factory. Modeled as an
 * `as const` object rather than a TypeScript enum.
 *
 * @public
 */
export const CalendarView = {
  Day: 'day',
  Month: 'month',
  Week: 'week',
} as const;

/**
 * Union of the supported {@link CalendarView} values.
 *
 * @public
 */
export type CalendarView = (typeof CalendarView)[keyof typeof CalendarView];

/**
 * Feature toggles for the Schedule-X plugin set the wrapper wires up. Each flag
 * maps to exactly one plugin in the plugin factory.
 *
 * @public
 */
export interface SchedulePluginsConfig {
  /** Programmatic view/date navigation (calendar-controls); backs `useCalendar`. */
  calendarControls?: boolean;
  /** Show the current-time indicator on time-grid views. */
  currentTime?: boolean;
  /** Allow dragging events to reschedule them. */
  dragAndDrop?: boolean;
  /** Show a modal when an event is clicked (backs the `eventModal` slot). */
  eventModal?: boolean;
  /** Reactive event CRUD (events-service); backs `useSchedule`'s event store. */
  eventsService?: boolean;
  /** Expand recurring events from their `rrule` (event-recurrence). */
  recurrence?: boolean;
  /** Allow resizing events to change their duration. */
  resize?: boolean;
}

/**
 * Interaction callbacks for a schedule. Datetimes are surfaced as ISO 8601
 * strings (`YYYY-MM-DD` for date-only) and events as engine-agnostic
 * {@link CalendarEvent}s — no Schedule-X / Temporal types leak through.
 *
 * Note: true drag-to-create (dragging on the grid to create an event) is the
 * premium `@sx-premium/drag-to-create` plugin and is out of scope; these
 * open-source click/double-click callbacks back the `useCalendarSelection` hook.
 *
 * @public
 */
export interface ScheduleCallbacks {
  /** Clicking a day cell in the month grid (date as `YYYY-MM-DD`). */
  onClickDate?: (date: string) => void;
  /** Clicking an empty slot in the day/week time grid (ISO 8601). */
  onClickDateTime?: (dateTime: string) => void;
  /** Double-clicking a day cell in the month grid (date as `YYYY-MM-DD`). */
  onDoubleClickDate?: (date: string) => void;
  /** Double-clicking an empty slot in the day/week time grid (ISO 8601). */
  onDoubleClickDateTime?: (dateTime: string) => void;
  /** Clicking an existing event. */
  onEventClick?: (event: CalendarEvent) => void;
}

/**
 * Configuration for a schedule — the list of events plus how it may be viewed.
 *
 * @public
 */
export interface ScheduleConfig {
  /** Interaction callbacks (clicks on events, empty time slots, or dates). */
  callbacks?: ScheduleCallbacks;
  /** Initially selected date (`Date` or ISO 8601 string). Defaults to today. */
  date?: Date | string;
  /** Initial/active view. Should be one of `views`. */
  defaultView?: CalendarView;
  /** Initial events. */
  events?: CalendarEvent[];
  /** Plugin feature toggles. Defaults to the full v1 plugin set. */
  plugins?: SchedulePluginsConfig;
  /** Enabled view styles. Defaults to week + month. */
  views?: readonly CalendarView[];
}
