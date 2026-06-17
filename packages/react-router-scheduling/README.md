# @openthrottle/react-router-scheduling

A source-first React Router scheduling/calendar library for OpenThrottle apps. It
wraps [Schedule-X](https://schedule-x.dev) behind a small, engine-agnostic,
TypeScript-first API of hooks, components, and utilities — day/week/month views,
drag-and-drop, resize, and event CRUD — themed to sit next to shadcn/Tailwind
tokens.

## Features

- **Batteries-included** `<CalendarLayout>` you can drop in with just `events`.
- **Composable primitives**: `<Calendar>` + the `useSchedule` / `useCalendar`
  hooks for custom layouts.
- **Engine-agnostic API**: events are a plain `CalendarEvent` (`Date | string`
  datetimes); Schedule-X (and its Temporal usage) stays behind the barrel so the
  engine can be swapped without churning consumers.
- **Recurring events**: `rrule`/`exdate` on a `CalendarEvent`, with `buildRRule`/
  `parseRRule` helpers for the supported RRULE subset.
- **Custom slots**: typed render slots for event cards, the event modal, and
  header content — each event slot receives a domain `CalendarEvent`.
- **Interactions**: domain-shaped click callbacks + a `useCalendarSelection`
  hook for click-to-create and event selection.
- **Official shadcn theme**: styled with `@schedule-x/theme-shadcn`, tracking the
  host app's light/dark mode automatically.
- **Source-first**: no build step — consuming apps' Vite transpiles `src`.

## Installation

This package is internal to the OpenThrottle monorepo and consumed via the
workspace:

```jsonc
// applications/<app>/package.json
{
  "dependencies": {
    "@openthrottle/react-router-scheduling": "workspace:^",
  },
}
```

Then `pnpm install` and run `pnpm nx sync` to wire the TypeScript project
reference.

## Quick start

```tsx
import { CalendarLayout } from '@openthrottle/react-router-scheduling';
import type { CalendarEvent } from '@openthrottle/react-router-scheduling';

const events: CalendarEvent[] = [
  {
    id: '1',
    title: 'Standup',
    start: '2026-06-15T09:00:00Z',
    end: '2026-06-15T09:15:00Z',
  },
  {
    id: '2',
    title: 'Offsite',
    start: '2026-06-18',
    end: '2026-06-19',
    allDay: true,
  },
];

export function Calendar() {
  return <CalendarLayout events={events} height="640px" />;
}
```

## Components

### `<CalendarLayout />`

The primary, drop-in surface. Composes `useSchedule`, `useCalendar`, a
navigation/view toolbar (shadcn `Button` + `ToggleGroup`), and `<Calendar>`.

| Prop          | Type              | Default         | Description                   |
| ------------- | ----------------- | --------------- | ----------------------------- |
| `events`      | `CalendarEvent[]` | `[]`            | Events to display.            |
| `views`       | `CalendarView[]`  | `[Week, Month]` | Enabled views.                |
| `defaultView` | `CalendarView`    | `Week`          | Initially active view.        |
| `defaultDate` | `Date \| string`  | today           | Initially selected date.      |
| `height`      | `string`          | `600px`         | Calendar height (CSS length). |
| `slots`       | `CalendarSlots`   | —               | Custom render slots.          |
| `className`   | `string`          | —               | Class on the layout root.     |

### `<Calendar />`

The primitive view: renders a schedule in a Schedule-X calendar (with the default
Schedule-X header). Use with `useSchedule` for custom layouts.

```tsx
import { Calendar, useSchedule } from '@openthrottle/react-router-scheduling';

function Custom() {
  const schedule = useSchedule({ events });
  return <Calendar schedule={schedule} height="500px" />;
}
```

Props: `schedule` (from `useSchedule`), `height`, `width`, `slots`, `className`,
`style`.

## Hooks

### `useSchedule(config?)`

Creates and owns the underlying calendar instance plus engine-agnostic event
CRUD. Usable standalone (no calendar view rendered — e.g. an agenda list).

```tsx
const schedule = useSchedule({
  events,
  views: [CalendarView.Week, CalendarView.Month],
});

schedule.all(); // CalendarEvent[]
schedule.getById('1'); // CalendarEvent | undefined
schedule.add(event);
schedule.update(event);
schedule.remove('1');
schedule.set(events); // replace all
```

Returns `{ instance, plugins, all, getById, add, update, remove, set }`.
`instance` / `plugins` are advanced escape hatches (coupling to the engine).

### `useCalendar(schedule, options?)`

A view/navigation lens over a schedule. Does not own events.

```tsx
const calendar = useCalendar(schedule, { defaultView: CalendarView.Week });

calendar.view; // CalendarView
calendar.date; // Date
calendar.setView(CalendarView.Month);
calendar.setDate(new Date());
calendar.next(); // step forward by the active view
calendar.prev();
calendar.today();
```

## Configuration

### Views

`CalendarView` is an `as const` object (not an enum): `CalendarView.Day`,
`CalendarView.Week`, `CalendarView.Month`. Defaults live in `config/defaults`
(`DEFAULT_VIEW`, `DEFAULT_VIEWS`).

### Plugins

`ScheduleConfig.plugins` (`SchedulePluginsConfig`) toggles the Schedule-X plugin
set; all enabled by default (`DEFAULT_PLUGINS`):

| Flag               | Plugin            | Purpose                            |
| ------------------ | ----------------- | ---------------------------------- |
| `eventsService`    | events-service    | Event CRUD store (always on).      |
| `calendarControls` | calendar-controls | View/date navigation.              |
| `dragAndDrop`      | drag-and-drop     | Drag events to reschedule.         |
| `resize`           | resize            | Resize events to change duration.  |
| `currentTime`      | current-time      | Current-time indicator.            |
| `recurrence`       | event-recurrence  | Expand recurring (`rrule`) events. |
| `eventModal`       | event-modal       | Click-to-open event modal.         |

## Theming

The calendar ships with Schedule-X's official **shadcn theme**
(`@schedule-x/theme-shadcn`, applied automatically by `<Calendar>` /
`<CalendarLayout>` — no setup required). It matches the shadcn default design.

**Light/dark** tracks the host app automatically: `<Calendar>` watches the
document element for the `.dark` class (with an OS `prefers-color-scheme`
fallback) and flips Schedule-X's theme to match, so the calendar follows your
app's theme toggle with no extra wiring.

> The official theme uses shadcn's **default** palette (fixed colors), not your
> app's live CSS tokens — so customized tokens (e.g. a brand accent) are not
> reflected in the calendar.

## Data types

```ts
interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string; // ISO 8601 for timed events
  end: Date | string;
  allDay?: boolean; // date-only (YYYY-MM-DD) when true
  calendarId?: string;
  description?: string;
  location?: string;
  people?: string[];
  rrule?: RecurrenceRule; // recurring series (see Recurrence)
  exdate?: (Date | string)[]; // dates excluded from the series
}
```

## Recurrence

Make an event the seed of a recurring series by giving it an `rrule` (an RFC 5545
RRULE wrapped in `RecurrenceRule`). The `event-recurrence` plugin (on by default)
expands occurrences; `exdate` removes specific occurrences.

Build and parse RRULE strings with the helpers rather than hand-writing them:

```ts
import {
  buildRRule,
  parseRRule,
  RecurrenceFrequency,
  RecurrenceWeekday,
} from '@openthrottle/react-router-scheduling';

const rrule = buildRRule({
  frequency: RecurrenceFrequency.Weekly,
  byDay: [RecurrenceWeekday.Monday, RecurrenceWeekday.Wednesday],
  count: 8,
});
// rrule.rule === 'FREQ=WEEKLY;COUNT=8;BYDAY=MO,WE'

const standup: CalendarEvent = {
  id: 'standup',
  title: 'Standup',
  start: '2026-06-15T09:00:00Z',
  end: '2026-06-15T09:15:00Z',
  rrule,
  exdate: ['2026-06-22T09:00:00Z'], // skip one week
};

parseRRule(rrule); // -> structured RecurrenceSpec
```

**Supported RRULE subset** (what the Schedule-X engine honors): `FREQ`
(`DAILY`/`WEEKLY`/`MONTHLY`/`YEARLY`) plus `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY`,
`BYMONTHDAY`, and `WKST`. `buildRRule`/`parseRRule` cover exactly this subset and
throw on an unsupported `FREQ`/weekday.

> **Caveat**: events using `BYDAY` with `MONTHLY`/`YEARLY` render correctly but
> cannot be rescheduled by drag-and-drop.

## Custom slots

Override how the calendar renders events, the event modal, and header regions via
the `slots` prop on `<Calendar>` / `<CalendarLayout>`. Event slots receive the
event as a domain `CalendarEvent` (never a Schedule-X / Temporal type):

```tsx
import type { CalendarEventSlotProps } from '@openthrottle/react-router-scheduling';

function EventCard({ calendarEvent }: CalendarEventSlotProps) {
  return (
    <div className="bg-primary/15 rounded px-1">{calendarEvent.title}</div>
  );
}

<CalendarLayout events={events} slots={{ timeGridEvent: EventCard }} />;
```

| Slot               | Receives        | Renders                            |
| ------------------ | --------------- | ---------------------------------- |
| `timeGridEvent`    | `CalendarEvent` | Timed events (week/day time grid). |
| `dateGridEvent`    | `CalendarEvent` | All-day events (week/day).         |
| `monthGridEvent`   | `CalendarEvent` | Events in the month grid.          |
| `monthAgendaEvent` | `CalendarEvent` | Events in the month-agenda list.   |
| `weekAgendaEvent`  | `CalendarEvent` | Events in the week-agenda list.    |
| `eventModal`       | `CalendarEvent` | The click-to-open event modal\*.   |
| `headerContent*`   | —               | Header regions (free content).     |

\* The `eventModal` slot only renders while the `eventModal` plugin is enabled
(on by default — clicking an event opens the modal). Disable it via
`plugins: { eventModal: false }` on the schedule config.

## Interactions

`ScheduleConfig.callbacks` (`ScheduleCallbacks`) reports clicks with domain
values — datetimes as ISO strings, events as `CalendarEvent`:

```tsx
const schedule = useSchedule({
  events,
  callbacks: {
    onClickDateTime: (iso) => console.log('clicked empty slot', iso),
    onEventClick: (event) => console.log('clicked', event.title),
  },
});
```

For click-to-create and selection UIs, `useCalendarSelection` tracks the most
recent click and hands back stable `callbacks` to spread into `useSchedule`:

```tsx
const selection = useCalendarSelection({
  onSelectDateTime: (iso) => openCreateDialog(iso),
});
const schedule = useSchedule({ events, callbacks: selection.callbacks });

// selection.selection.dateTime / .date / .event — the latest click
// selection.clear() — reset
schedule.add({ id, title: 'New', start: selection.selection.dateTime, end });
```

> **Drag-to-create**: dragging across the grid to create an event is the premium
> `@sx-premium/drag-to-create` plugin and is **out of scope** here. These
> open-source click/double-click callbacks are the supported path.

## Notes

- **Temporal**: Schedule-X uses the Temporal API via `globalThis.Temporal`. The
  components install `temporal-polyfill/global` automatically; the datetime
  helpers bridge `Date`/ISO ↔ Temporal so consumers never touch it.
- **Scope**: core scheduler, recurrence (RRULE), custom slots, and interactions
  (`useCalendarSelection`) are all shipped. True drag-to-create remains out of
  scope (premium Schedule-X plugin).
