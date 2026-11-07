import type { BrowserWindowConstructorOptions } from 'electron';

import type { Rectangle } from './window-state/is-bounds-visible.ts';

/**
 * @description Builds the `BrowserWindow` options for the app window. The web
 * preferences are the sandbox contract from docs/architecture.md: isolated
 * context, sandboxed renderer, no Node integration, web security on, no
 * webview tag, no insecure-content or experimental features. Kept pure so it can be
 * unit-tested without Electron running. `bounds` are restored window bounds (already checked against the connected
 * displays) that override the default size and position. `partition` is the per-server session
 * partition for the app window; the connection screen passes `undefined` and
 * uses the default session.
 */
export const buildWindowOptions = (
  preloadPath: string,
  partition: string | undefined,
  bounds: Rectangle | undefined,
): BrowserWindowConstructorOptions => {
  return {
    height: 800,
    minHeight: 480,
    minWidth: 640,
    show: false,
    title: 'OpenThrottle',
    webPreferences: {
      allowRunningInsecureContent: false,
      contextIsolation: true,
      experimentalFeatures: false,
      nodeIntegration: false,
      ...(partition === undefined ? {} : { partition }),
      preload: preloadPath,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    },
    width: 1280,
    ...bounds,
  };
};
