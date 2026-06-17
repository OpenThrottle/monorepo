/**
 * Public API for `@openthrottle/react-router-scheduling`.
 *
 * Engine-exposure boundary (decision, 2026-06-16):
 * - The supported, engine-agnostic contract is the wrapped surface: the
 *   `<Calendar>` / `<CalendarLayout>` components, the `useSchedule` /
 *   `useCalendar` hooks, the `CalendarEvent` / `CalendarView` / `ScheduleConfig`
 *   / `SchedulePluginsConfig` / `RecurrenceRule` types, and the config defaults.
 *   Styling is the official `@schedule-x/theme-shadcn` theme (applied by
 *   `<Calendar>`, which also tracks the host app's light/dark mode).
 * - This barrel deliberately does NOT re-export any `@schedule-x/*` package
 *   types. Schedule-X is never reachable *through* this package's public API, so
 *   the engine stays swappable. The `UseScheduleResult.instance` / `.plugins`
 *   fields remain typed (structurally, via inference) as advanced escape hatches,
 *   but using them couples the caller to the current engine.
 * - The lower-level utilities below (event adapters, plugin factory, view
 *   mapping, Temporal datetime helpers, polyfill bootstrap) are exported for
 *   advanced/internal consumers, but are not part of the stable engine-agnostic
 *   contract and may change if the engine changes.
 */

// Components
export * from './components/Calendar';
export * from './components/CalendarLayout';
// Slot types only — `buildCustomComponents` stays internal (its signature
// references the engine event type, which must not leak through the barrel).
export type {
  CalendarEventSlot,
  CalendarEventSlotProps,
  CalendarHeaderSlot,
  CalendarSlots,
} from './components/slots';

// Hooks
export * from './hooks/useCalendar';
export * from './hooks/useCalendarSelection';
export * from './hooks/useSchedule';

// Types + config (engine-agnostic contract)
export * from './config/defaults';
export * from './types';

// Recurrence helpers (engine-agnostic RRULE build/parse for the supported subset)
export * from './utils/recurrence';

// Advanced / engine-coupled utilities (not part of the stable contract)
export * from './utils/datetime';
export * from './utils/events';
export * from './utils/plugins';
export * from './utils/temporal-bootstrap';
export * from './utils/views';
