# @openthrottle/react-router-scheduling — agent notes

Engine-agnostic scheduling/calendar library wrapping Schedule-X v4: `<CalendarLayout>` drop-in, `<Calendar>` + `useSchedule`/`useCalendar` primitives, RRULE recurrence helpers, typed render slots, click callbacks.

**Consumed by:** `openthrottle-developer`.

## Layout

- [src/hooks/useSchedule.ts](src/hooks/useSchedule.ts) — owns the calendar instance + engine-agnostic event CRUD (`add`/`update`/`remove`/`set`).
- [src/components/CalendarLayout.tsx](src/components/CalendarLayout.tsx) / [Calendar.tsx](src/components/Calendar.tsx) — drop-in surface vs primitive view.
- [src/utils/datetime.ts](src/utils/datetime.ts) — bridges `Date`/ISO ↔ Temporal so consumers never touch Temporal.
- [src/utils/temporal-bootstrap.ts](src/utils/temporal-bootstrap.ts) — side-effect install of the global Temporal polyfill.
- [src/utils/recurrence.ts](src/utils/recurrence.ts) — `buildRRule`/`parseRRule` for the supported RRULE subset.

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- **Temporal is the global, never the module.** Schedule-X v4 reads `globalThis.Temporal` directly, so this package uses `import 'temporal-polyfill/global'` (side effect) plus the bare global `Temporal`. Never `import { Temporal } from 'temporal-polyfill'` — the module and global type identities are structurally non-assignable, splitting the types Schedule-X consumes. The polyfill must be installed before any calendar is created; `<Calendar>` does this for consumers via `temporal-bootstrap.ts`.
- **Engine-agnostic API is the point:** public props/callbacks/slots deal only in the domain `CalendarEvent` (`Date | string` datetimes) — never leak Schedule-X or Temporal types through the barrel, so the engine stays swappable.
- **`events` is seed-plus-replace, keyed on array identity.** A new array reference replaces displayed events; in-place mutation is not observed; a new array every render thrashes the store — memoize or hold in state. Incremental changes go through `useSchedule`'s CRUD.
- RRULE support is a subset (`FREQ` + `INTERVAL`/`COUNT`/`UNTIL`/`BYDAY`/`BYMONTHDAY`/`WKST`); helpers throw outside it. `BYDAY` with `MONTHLY`/`YEARLY` renders but can't be drag-rescheduled. Drag-to-create is a premium Schedule-X plugin — out of scope.
- Tests use [tests/setup.ts](tests/setup.ts) (`setupReactRouterTest`); Schedule-X needs its jsdom polyfills to mount.

## Pointers

- [README.md](README.md) — full API tables, slots, callbacks, recurrence examples.
