# @openthrottle/openthrottle-desktop-bridge — agent notes

The TypeScript contract for `window.openthrottleDesktop` (interface, IPC channel
names, `getDesktopBridge` guard, deep-link route mapper). It exists so
`openthrottle-app` (preload + main) and `openthrottle-developer` (via
`@openthrottle/react-router-notifications`) share one definition without an
application → application reference.

**Consumed by:** `openthrottle-app`, `@openthrottle/react-router-notifications`.

## Layout

- `src/data/data.desktop-bridge.ts` — bridge name, protocol, `DESKTOP_IPC_CHANNELS`.
- `src/types/desktop-bridge.ts` — the bridge interface and result types.
- `src/utils/` — `getDesktopBridge`, `mapDeepLink`, `toPlanRoute`, `findDeepLink`, `parseNotifyInput`.

## Invariants & gotchas

- Source-first ESM + nodenext (relative imports carry `.ts`); the preload bundles it into a CJS file, so keep it free of runtime deps and Electron/DOM imports.
- The mapper is the security boundary for deep links and notification click-throughs: ids must be UUIDs, only `/plans/<uuid>` exists today. Add a route by extending `toPlanRoute`'s sibling and its tests, never by loosening the regex.
- A feature-detect only: the bridge's presence proves nothing about trust. Main re-validates the sender frame on every IPC call.

## Pointers

- [README.md](README.md) — usage.
- [../../applications/openthrottle-app/AGENTS.md](../../applications/openthrottle-app/AGENTS.md) — gating, deep links, notification focus rule.
