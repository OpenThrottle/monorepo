import type { CalendarEventExternal } from '@schedule-x/calendar';

import type { CalendarEvent } from '../types';
import { temporalToISOString, toPlainDate, toZonedDateTime } from './datetime';

// Adapters between the engine-agnostic CalendarEvent and the Schedule-X event
// shape. This mapping — especially bridging the Temporal datetimes — is the core
// value-add of the wrapper; the hooks and components compose on top of it.

type EngineDateTime = CalendarEventExternal['start'];

function toEngineDateTime(
  value: Date | string,
  allDay: boolean,
): EngineDateTime {
  return allDay ? toPlainDate(value) : toZonedDateTime(value);
}

/**
 * Map an engine-agnostic {@link CalendarEvent} to a Schedule-X event. All-day
 * events use `Temporal.PlainDate`; timed events use `Temporal.ZonedDateTime` in
 * the system timezone.
 *
 * @public
 */
export function toEngineEvent(event: CalendarEvent): CalendarEventExternal {
  const allDay = event.allDay ?? false;
  const result: CalendarEventExternal = {
    end: toEngineDateTime(event.end, allDay),
    id: event.id,
    start: toEngineDateTime(event.start, allDay),
  };

  if (event.calendarId !== undefined) result.calendarId = event.calendarId;
  if (event.description !== undefined) result.description = event.description;
  if (event.location !== undefined) result.location = event.location;
  if (event.people !== undefined) result.people = event.people;
  if (event.title !== undefined) result.title = event.title;

  // The event-recurrence plugin reads a raw RRULE string and a string[] of
  // excluded dates directly off the engine event.
  if (event.rrule !== undefined) result.rrule = event.rrule.rule;
  if (event.exdate !== undefined) {
    result.exdate = event.exdate.map((value) =>
      temporalToISOString(toEngineDateTime(value, allDay)),
    );
  }

  return result;
}

/**
 * Map a Schedule-X event back to an engine-agnostic {@link CalendarEvent}.
 * Datetimes become ISO 8601 strings (timed) or `YYYY-MM-DD` (all-day); all-day
 * is inferred from a `Temporal.PlainDate` start. The engine's numeric-or-string
 * id is normalized to a string.
 *
 * @public
 */
export function fromEngineEvent(event: CalendarEventExternal): CalendarEvent {
  const allDay = !('epochMilliseconds' in event.start);
  const result: CalendarEvent = {
    end: temporalToISOString(event.end),
    id: String(event.id),
    start: temporalToISOString(event.start),
    title: event.title ?? '',
  };

  if (allDay) result.allDay = true;

  if (event.calendarId !== undefined) result.calendarId = event.calendarId;
  if (event.description !== undefined) result.description = event.description;
  if (event.location !== undefined) result.location = event.location;
  if (event.people !== undefined) result.people = event.people;

  // rrule/exdate live under the engine event's index signature (typed `any`);
  // narrow at runtime so the domain shape stays type-safe without casts.
  const { exdate, rrule } = event;
  if (typeof rrule === 'string') result.rrule = { rule: rrule };
  if (Array.isArray(exdate)) {
    result.exdate = exdate.filter(
      (value): value is string => typeof value === 'string',
    );
  }

  return result;
}
