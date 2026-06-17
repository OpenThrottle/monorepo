import type { CalendarConfig } from '@schedule-x/calendar';
import type { ScheduleCallbacks } from '../types';
import { fromEngineEvent } from './events';
import { temporalToISOString } from './datetime';

// Adapt the engine-agnostic ScheduleCallbacks into the Schedule-X `callbacks`
// config: Temporal datetimes become ISO strings and engine events become domain
// CalendarEvents, so consumers (and the useCalendarSelection hook) never touch
// Schedule-X / Temporal types.

/** The Schedule-X `callbacks` config shape (engine type, not re-exported). */
type EngineCallbacks = NonNullable<CalendarConfig['callbacks']>;

/**
 * Build the Schedule-X `callbacks` config from {@link ScheduleCallbacks},
 * adapting Temporal datetimes to ISO strings and engine events to domain
 * {@link CalendarEvent}s. Returns `undefined` when no callbacks are provided.
 */
export function toEngineCallbacks(
  callbacks: ScheduleCallbacks | undefined,
): EngineCallbacks | undefined {
  if (callbacks === undefined) {
    return undefined;
  }

  const result: EngineCallbacks = {};
  const { onClickDate, onClickDateTime, onDoubleClickDate } = callbacks;
  const { onDoubleClickDateTime, onEventClick } = callbacks;

  if (onClickDate !== undefined) {
    result.onClickDate = (date): void => onClickDate(temporalToISOString(date));
  }

  if (onClickDateTime !== undefined) {
    result.onClickDateTime = (dateTime): void =>
      onClickDateTime(temporalToISOString(dateTime));
  }

  if (onDoubleClickDate !== undefined) {
    result.onDoubleClickDate = (date): void =>
      onDoubleClickDate(temporalToISOString(date));
  }

  if (onDoubleClickDateTime !== undefined) {
    result.onDoubleClickDateTime = (dateTime): void =>
      onDoubleClickDateTime(temporalToISOString(dateTime));
  }

  if (onEventClick !== undefined) {
    result.onEventClick = (event): void => onEventClick(fromEngineEvent(event));
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
