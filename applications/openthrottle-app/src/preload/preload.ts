// One preload serves every window and exposes exactly one bridge per page:
//
// - `window.openthrottleShell` ONLY on the connection screen, which main loads
//   from a `file:` URL (loadFile).
// - `window.openthrottleDesktop` ONLY on the Developer app's origin. Main
//   decides: the preload asks it synchronously ("handshake") and main answers
//   `allowed` only when the top frame is on the CURRENT app origin. The origin
//   cannot be baked in through `additionalArguments`: the window is created
//   before the embedded server picks its port, and the port changes again on a
//   child restart.
//
// Both gates are defense in depth; main re-validates the sender frame on every
// IPC call.
import type {
  DesktopNotifyInput,
  OpenThrottleDesktopBridge,
} from '@openthrottle/openthrottle-desktop-bridge';
import {
  DESKTOP_BRIDGE_NAME,
  DESKTOP_IPC_CHANNELS,
} from '@openthrottle/openthrottle-desktop-bridge';
import { contextBridge, ipcRenderer } from 'electron';

import {
  SHELL_BRIDGE_NAME,
  SHELL_IPC_CHANNELS,
} from '../bridge/data/data.shell-channels.ts';
import type { ShellBridge } from '../bridge/types/shell-bridge.ts';

// The main tsconfig has no DOM lib; the preload only reads this one field.
declare const location: { readonly protocol: string };

const readHandshake = (): { platform: string; version: string } | undefined => {
  const reply: unknown = ipcRenderer.sendSync(DESKTOP_IPC_CHANNELS.handshake);

  if (typeof reply !== 'object' || reply === null) {
    return undefined;
  }

  const platform: unknown = Reflect.get(reply, 'platform');
  const version: unknown = Reflect.get(reply, 'version');
  const isAllowed = Reflect.get(reply, 'allowed') === true;

  if (
    !isAllowed ||
    typeof platform !== 'string' ||
    typeof version !== 'string'
  ) {
    return undefined;
  }

  return { platform, version };
};

if (location.protocol === 'file:') {
  const bridge: ShellBridge = {
    getSettings: () => ipcRenderer.invoke(SHELL_IPC_CHANNELS.getSettings),
    saveServer: (url) => ipcRenderer.invoke(SHELL_IPC_CHANNELS.saveServer, url),
    testServer: (url) => ipcRenderer.invoke(SHELL_IPC_CHANNELS.testServer, url),
  };

  contextBridge.exposeInMainWorld(SHELL_BRIDGE_NAME, bridge);
} else if (location.protocol === 'http:' || location.protocol === 'https:') {
  const handshake = readHandshake();

  if (handshake !== undefined) {
    const bridge: OpenThrottleDesktopBridge = {
      notify: (input: DesktopNotifyInput) => {
        return ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.notify, input);
      },
      openExternal: (url) => {
        return ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.openExternal, url);
      },
      platform: handshake.platform,
      version: handshake.version,
    };

    contextBridge.exposeInMainWorld(DESKTOP_BRIDGE_NAME, bridge);
  }
}
