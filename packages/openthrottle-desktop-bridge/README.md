# @openthrottle/openthrottle-desktop-bridge

The typed contract for `window.openthrottleDesktop`, the small bridge the
OpenThrottle Electron shell (`openthrottle-app`) exposes to the Developer app. It
lives in a package so both applications can import it without an application →
application reference. Source-first, no runtime dependencies, no Electron imports.

## Installation

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-desktop-bridge
```

**npm:**

```bash
npm install @openthrottle/openthrottle-desktop-bridge
```

## What it exports

- `OpenThrottleDesktopBridge` (`notify`, `openExternal`, `platform`, `version`) and its input/result types.
- `DESKTOP_BRIDGE_NAME`, `DESKTOP_IPC_CHANNELS`, `DESKTOP_DEEP_LINK_PROTOCOL`.
- `getDesktopBridge()` / `isDesktopBridge()` — feature detection; `undefined` in a normal browser.
- `mapDeepLink(url)` / `toPlanRoute(path)` — strict `openthrottle://plans/<uuid>` → `/plans/<uuid>` mapping.
- `findDeepLink(argv)`, `parseNotifyInput(value)` — used by the shell's main process.

## Usage

```ts
import { getDesktopBridge } from '@openthrottle/openthrottle-desktop-bridge';

const bridge = getDesktopBridge();

if (bridge !== undefined) {
  await bridge.notify({
    body: 'Done',
    link: '/plans/<uuid>',
    title: 'Plan finished',
  });
}
```

Run the tests with `pnpm nx run @openthrottle/openthrottle-desktop-bridge:test`.
