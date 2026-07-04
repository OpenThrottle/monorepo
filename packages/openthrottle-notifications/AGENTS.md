# @openthrottle/openthrottle-notifications — agent notes

Framework-agnostic notification **contract**: event-name discriminators, severities, and
payload type shapes shared between the NestJS server (emit) and `openthrottle-developer`
(handle). Types + `as const` value objects only — no runtime deps. Delivery is over
graphql-ws subscriptions; the Socket.IO path has been retired.

**Consumed by:** `openthrottle-server`, `openthrottle-developer`,
`@openthrottle/react-router-notifications`, `@openthrottle/react-router-ui`.

## Layout

- `src/events.ts` — `NOTIFICATION_EVENT_NAMES`, payload interfaces, `NotificationEventMap`.
- `src/types.ts` — `NOTIFICATION_SEVERITIES` / `NotificationSeverity`.

## Invariants & gotchas

- Source-first (`__build-package` placeholder alongside a `build` target; consumers
  transpile `src`). See [../AGENTS.md](../AGENTS.md).
- This package is only the discriminator/severity contract. The **authoritative wire
  shape** is the code-first `NotificationEvent` types in the server GraphQL schema — if you
  change a payload here, reconcile it against the schema, not the reverse.
- Status-change events (`plan.status_changed`, `task.status_changed`) are intentionally
  display-less revalidation signals: they do **not** extend `NotificationPayloadBase` and
  are excluded from the `NotificationPayload` union. Don't fold them back in.

## Pointers

- [README.md](./README.md) — full export list and the schema-is-authoritative note.
