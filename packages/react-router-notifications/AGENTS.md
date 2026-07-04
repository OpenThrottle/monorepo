# @openthrottle/react-router-notifications — agent notes

In-app notifications for React Router apps: store provider/context, bell + list UI, browser (system) notification permission flows, and a realtime bridge fed by the graphql-ws subscription transport.

**Consumed by:** `openthrottle-developer`.

## Layout

- [src/components/NotificationsSubscriptionBridge.tsx](src/components/NotificationsSubscriptionBridge.tsx) — subscribes to the `notifications` firehose via `useSubscription` from `@openthrottle/react-router-graphql`; feeds store → toast → system notification.
- [src/data/notifications-store.context.tsx](src/data/notifications-store.context.tsx) — store context + `toastForNotification`.
- [src/config/index.ts](src/config/index.ts) — limits, dedup window, localStorage keys (well-commented; read before changing persistence).
- [src/utils/system-notification.ts](src/utils/system-notification.ts) — desktop Notification API wrapper + preference reads.

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- **README's intro is stale:** it still says "Socket.IO client wiring", but the transport is graphql-ws (see the bridge component and `package.json` description). Don't reintroduce Socket.IO based on it.
- **No codegen target on purpose.** The bridge takes the generated subscription `document` (`TypedDocumentNode`) and the `GraphqlWsClient` as props so codegen artifacts stay app-side. Pass `client: null` during SSR to no-op. Mount the bridge once, inside `NotificationsStoreProvider`.
- Payloads carry **no stable id** — dedup is content + time based (`event` + `message` + `link` within `NOTIFICATIONS_DEDUP_WINDOW_MS`, 5s) because reconnect replays re-deliver events. Keep that in mind when changing payload shape.
- Two distinct localStorage keys: the preference object (`${APP_NAME}:notifications:prefs`) vs the notification list (`${APP_NAME}:notifications`). Separate writers by design — don't merge them.
- Event names/payload types come from `@openthrottle/openthrottle-notifications` (type imports).

## Pointers

- [README.md](README.md) — installation only (and a stale intro, per above).
