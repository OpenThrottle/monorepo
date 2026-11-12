import type {
  DesktopHandshake,
  DesktopNotifyInput,
  DesktopNotifyResult,
  DesktopOpenExternalResult,
} from '@openthrottle/openthrottle-desktop-bridge';
import {
  DESKTOP_IPC_CHANNELS,
  parseNotifyInput,
} from '@openthrottle/openthrottle-desktop-bridge';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';

import { isAppSender } from '../security/isAppSender.ts';
import { toExternalUrl } from '../security/toExternalUrl.ts';

/** The two `ipcMain` methods used; a narrow shape so tests need no Electron. */
export interface DesktopIpcMain {
  readonly handle: (
    channel: string,
    handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown,
  ) => void;
  readonly on: (
    channel: string,
    listener: (event: IpcMainEvent) => void,
  ) => void;
}

export interface DesktopIpcOptions {
  /** The origin the window may load in-app right now; read live on every call. */
  readonly getAppOrigin: () => string | undefined;
  readonly ipcMain: DesktopIpcMain;
  readonly notify: (input: DesktopNotifyInput) => DesktopNotifyResult;
  /** Receives only a URL that already passed `toExternalUrl`. */
  readonly openExternal: (url: string) => void;
  readonly platform: string;
  readonly version: string;
}

const REJECTED = 'Request rejected.';

/**
 * @description Registers the desktop bridge handlers. The real guard is here,
 * not in the preload: every call re-validates the sender frame (top frame on
 * the app's CURRENT origin) and its argument. `openExternal` reuses the task-4
 * `toExternalUrl` policy (http/https only).
 */
export const registerDesktopIpc = (options: DesktopIpcOptions): void => {
  const { getAppOrigin, ipcMain, notify, openExternal, platform, version } =
    options;

  const isTrusted = (event: IpcMainEvent | IpcMainInvokeEvent): boolean => {
    const frame = event.senderFrame;

    return isAppSender({
      appOrigin: getAppOrigin(),
      frameUrl: frame?.url,
      isMainFrame: frame !== null && frame === event.sender.mainFrame,
    });
  };

  ipcMain.on(DESKTOP_IPC_CHANNELS.handshake, (event) => {
    const handshake: DesktopHandshake = isTrusted(event)
      ? { allowed: true, platform, version }
      : { allowed: false };

    event.returnValue = handshake;
  });

  ipcMain.handle(
    DESKTOP_IPC_CHANNELS.openExternal,
    (event, url: unknown): DesktopOpenExternalResult => {
      if (!isTrusted(event)) {
        return { ok: false, reason: REJECTED };
      }

      const external = typeof url === 'string' ? toExternalUrl(url) : undefined;

      if (external === undefined) {
        return { ok: false, reason: 'Only http and https URLs can be opened.' };
      }

      openExternal(external);

      return { ok: true };
    },
  );

  ipcMain.handle(
    DESKTOP_IPC_CHANNELS.notify,
    (event, input: unknown): DesktopNotifyResult => {
      if (!isTrusted(event)) {
        return { ok: false, reason: REJECTED };
      }

      const parsed = parseNotifyInput(input);

      return parsed.ok ? notify(parsed.input) : parsed;
    },
  );
};
