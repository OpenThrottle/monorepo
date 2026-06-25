# @openthrottle/openthrottle-notifications

Shared, framework-agnostic **notification contract** for OpenThrottle: the well-known
event-name discriminators, severities, and payload type shapes used by the NestJS
server (emit) and the `openthrottle-developer` app (handle). Real-time delivery is over
GraphQL subscriptions (graphql-ws); the Socket.IO path has been retired.

This is a **source-first** package — `main`/`module`/`types` point at `./src/index.ts`
and consumers transpile the source directly (no `dist/` build). It ships only types and
`as const` value objects (no runtime dependencies).

## What it exports

- `NOTIFICATION_EVENT_NAMES` / `NotificationEventName` — well-known event-name
  discriminators (e.g. `plan.enqueued`, `task.completed`, `plan.status_changed`).
- `NOTIFICATION_SEVERITIES` / `NotificationSeverity` — severity values for styling and
  filtering.
- `NotificationPayloadBase` and the display payloads that extend it (`DebugPayload`,
  `PlanEnqueuedPayload`, `PlanUpdatedPayload`, `TaskCompletedPayload`,
  `QueueJobCompletedPayload`, `SystemAlertPayload`, `PlanWaitingForWorktreePayload`),
  plus the `NotificationPayload` union over them.
- `StatusChangeBase`, `PlanStatusChangedPayload`, `TaskStatusChangedPayload`, and the
  `StatusChangePayload` discriminated union. **Status-change events are intentionally
  display-less revalidation signals** — they do not extend `NotificationPayloadBase`
  (no `message`/`severity`/`link`) and are excluded from the `NotificationPayload`
  union; consumers handle them separately to revalidate detail views.
- `NotificationEventMap` — maps each event name to its payload type for type-safe
  emit/handle.

The on-the-wire payloads are the code-first `NotificationEvent` types in the server
GraphQL schema; treat those as authoritative for wire shape and these interfaces as the
discriminator/severity contract they map onto.

## Consumed by

`applications/openthrottle-server`, `applications/openthrottle-developer`,
`@openthrottle/react-router-notifications`, and `@openthrottle/react-router-ui`
(websocket debugger).

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-notifications
```

**npm:**

```bash
npm install @openthrottle/openthrottle-notifications
```
