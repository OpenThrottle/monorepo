# @openthrottle/react-router-notifications — agent notes

In-app notifications for React Router apps: store provider/context, bell + list UI, browser (system) notification permission flows, and a realtime bridge fed by the graphql-ws subscription transport.

**Consumed by:** `openthrottle-developer`.

## Layout

- [src/components/NotificationsSubscriptionBridge.tsx](src/components/NotificationsSubscriptionBridge.tsx) — subscribes to the `notifications` firehose via `useSubscription` from `@openthrottle/react-router-graphql`; feeds store → toast → system notification.
- [src/data/data.notifications-store.context.ts](src/data/data.notifications-store.context.ts) — store context + value/action types; the reducer, storage helpers and `toastForNotification` live in [src/utils/](src/utils/).
- [src/config/index.ts](src/config/index.ts) — limits, dedup window, localStorage keys (well-commented; read before changing persistence).
- [src/utils/system-notification.ts](src/utils/system-notification.ts) — desktop Notification API wrapper + preference reads.

## Invariants & gotchas

- Source-first, no build target (`__build`/`__build-package` placeholders) — see [packages/AGENTS.md](../AGENTS.md).
- **README's intro is stale:** it still says "Socket.IO client wiring", but the transport is graphql-ws (see the bridge component and `package.json` description). Don't reintroduce Socket.IO based on it.
- **No codegen target on purpose.** The bridge takes the generated subscription `document` (`TypedDocumentNode`) and the `GraphqlWsClient` as props so codegen artifacts stay app-side. Pass `client: null` during SSR to no-op. Mount the bridge once, inside `NotificationsStoreProvider`.
- Payloads carry **no stable id** — dedup is content + time based (`event` + `message` + `link` within `NOTIFICATIONS_DEDUP_WINDOW_MS`, 5s) because reconnect replays re-deliver events. Keep that in mind when changing payload shape.
- Two distinct localStorage keys: the preference object (`${APP_NAME}:notifications:prefs`) vs the notification list (`${APP_NAME}:notifications`). Separate writers by design — don't merge them.
- **Desktop bridge:** `showSystemNotification` first checks `getDesktopBridge()` (from `@openthrottle/openthrottle-desktop-bridge`); inside the Electron shell it calls `bridge.notify` and skips the Web Notifications API (main decides whether to show it). Without the bridge the Web path is unchanged. Only an explicit stored `enabled: false` opts out on desktop.
- Event names/payload types come from `@openthrottle/openthrottle-notifications` (type imports).

## Pointers

- [README.md](README.md) — installation only (and a stale intro, per above).
