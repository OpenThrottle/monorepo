import { createElement } from 'react';
import type { CalendarEventExternal } from '@schedule-x/calendar';
import type { ComponentType, ReactElement } from 'react';
import type { CalendarEvent } from '../types';
import { fromEngineEvent } from '../utils/events';

// Typed, engine-agnostic custom-component slots. Schedule-X renders custom event
// components via ScheduleXCalendar's `customComponents` map, handing each one the
// raw engine event. These wrappers adapt that engine event to a domain
// CalendarEvent (via the event adapters) before handing it to the consumer, so
// slot authors never touch Schedule-X / Temporal types and the engine stays
// swappable behind the barrel.

/**
 * Props passed to a {@link CalendarEventSlot}: the event being rendered, in the
 * engine-agnostic {@link CalendarEvent} shape.
 *
 * @public
 */
export interface CalendarEventSlotProps {
  /** The event to render, adapted to the domain shape. */
  readonly calendarEvent: CalendarEvent;
}

/**
 * A custom renderer for an event in a calendar view. Receives the event as a
 * domain {@link CalendarEvent}.
 *
 * @public
 */
export type CalendarEventSlot = ComponentType<CalendarEventSlotProps>;

/**
 * A custom renderer for a header region. Receives no props — render branding,
 * actions, etc.; the engine's internal app handle is intentionally not exposed.
 *
 * @public
 */
export type CalendarHeaderSlot = ComponentType;

/**
 * Custom render slots for a calendar. Event-render slots (and the event modal)
 * receive the event as a domain {@link CalendarEvent}; header slots render free
 * content. The `eventModal` slot only renders when the event-modal plugin is
 * enabled (on by default).
 *
 * @public
 */
export interface CalendarSlots {
  /** All-day events in the week/day grid. */
  dateGridEvent?: CalendarEventSlot;
  /** The modal shown when an event is clicked (requires the event-modal plugin). */
  eventModal?: CalendarEventSlot;
  /** Replaces the entire header bar. */
  headerContent?: CalendarHeaderSlot;
  /** Appended to the left side of the header. */
  headerContentLeftAppend?: CalendarHeaderSlot;
  /** Prepended to the left side of the header. */
  headerContentLeftPrepend?: CalendarHeaderSlot;
  /** Appended to the right side of the header. */
  headerContentRightAppend?: CalendarHeaderSlot;
  /** Prepended to the right side of the header. */
  headerContentRightPrepend?: CalendarHeaderSlot;
  /** Events in the month-agenda list. */
  monthAgendaEvent?: CalendarEventSlot;
  /** Events in the month grid. */
  monthGridEvent?: CalendarEventSlot;
  /** Timed events in the week/day time grid. */
  timeGridEvent?: CalendarEventSlot;
  /** Events in the week-agenda list. */
  weekAgendaEvent?: CalendarEventSlot;
}

/** Props Schedule-X hands to an event custom-component (raw engine event). */
interface EngineEventSlotProps {
  readonly calendarEvent: CalendarEventExternal;
}

type EngineCustomComponents = Record<
  string,
  ComponentType<EngineEventSlotProps>
>;

// Event-bearing slots: the wrapper adapts the engine event to a domain event.
const EVENT_SLOT_NAMES = [
  'dateGridEvent',
  'eventModal',
  'monthAgendaEvent',
  'monthGridEvent',
  'timeGridEvent',
  'weekAgendaEvent',
] as const;

// Header slots: free content; the engine's app handle is not forwarded.
const HEADER_SLOT_NAMES = [
  'headerContent',
  'headerContentLeftAppend',
  'headerContentLeftPrepend',
  'headerContentRightAppend',
  'headerContentRightPrepend',
] as const;

/**
 * Turn the engine-agnostic {@link CalendarSlots} into the Schedule-X
 * `customComponents` map: event slots become wrappers that adapt the engine
 * event to a domain {@link CalendarEvent} before delegating to the consumer's
 * renderer; header slots render free content with no engine props forwarded.
 * Returns `undefined` when no slots are provided so the calendar falls back to
 * Schedule-X's defaults.
 */
export function buildCustomComponents(
  slots: CalendarSlots | undefined,
): EngineCustomComponents | undefined {
  if (slots === undefined) {
    return undefined;
  }

  const result: EngineCustomComponents = {};

  for (const name of EVENT_SLOT_NAMES) {
    const Renderer = slots[name];
    if (Renderer !== undefined) {
      result[name] = (props: EngineEventSlotProps): ReactElement =>
        createElement(Renderer, {
          calendarEvent: fromEngineEvent(props.calendarEvent),
        });
    }
  }

  for (const name of HEADER_SLOT_NAMES) {
    const Renderer = slots[name];
    if (Renderer !== undefined) {
      result[name] = (): ReactElement => createElement(Renderer);
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
