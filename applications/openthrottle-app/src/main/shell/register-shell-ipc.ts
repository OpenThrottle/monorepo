import type { IpcMain, IpcMainInvokeEvent } from 'electron';

import { SHELL_IPC_CHANNELS } from '../../bridge/data/data.shell-channels.ts';
import type {
  SaveServerResult,
  ShellSettings,
  TestServerResult,
} from '../../bridge/types/shell-bridge.ts';
import { isShellSender } from '../security/is-shell-sender.ts';
import type { ProbeOtServerResult } from '../server/probe-ot-server.ts';
import { normalizeServerUrl } from '../utils/normalize-server-url.ts';

export interface ShellIpcOptions {
  readonly getSettings: () => Promise<ShellSettings>;
  readonly ipcMain: Pick<IpcMain, 'handle'>;
  readonly probe: (serverUrl: string) => Promise<ProbeOtServerResult>;
  /** Persists the server; resolves once it is saved. */
  readonly save: (serverUrl: string) => Promise<SaveServerResult>;
  readonly shellUrl: string;
}

const REJECTED = 'Request rejected.';

/**
 * @description Registers the shell bridge handlers. Each one validates the
 * sender frame (only the connection screen's own page) and its argument (a
 * string parsed to an http/https origin) before doing anything.
 */
export const registerShellIpc = (options: ShellIpcOptions): void => {
  const { getSettings, ipcMain, probe, save, shellUrl } = options;

  const isTrusted = (event: IpcMainInvokeEvent): boolean => {
    const frame = event.senderFrame;

    return isShellSender({
      frameUrl: frame?.url,
      isMainFrame: frame !== null && frame === event.sender.mainFrame,
      shellUrl,
    });
  };

  ipcMain.handle(
    SHELL_IPC_CHANNELS.getSettings,
    async (event): Promise<ShellSettings> => {
      if (!isTrusted(event)) {
        throw new Error(REJECTED);
      }

      return getSettings();
    },
  );

  ipcMain.handle(
    SHELL_IPC_CHANNELS.testServer,
    async (event, url: unknown): Promise<TestServerResult> => {
      if (!isTrusted(event)) {
        throw new Error(REJECTED);
      }

      const normalized = normalizeServerUrl(url);

      if (!normalized.ok) {
        return { ok: false, reason: normalized.reason };
      }

      const result = await probe(normalized.url);

      return result.ok
        ? { health: result.health, ok: true, url: normalized.url }
        : { ok: false, reason: result.reason };
    },
  );

  ipcMain.handle(
    SHELL_IPC_CHANNELS.saveServer,
    async (event, url: unknown): Promise<SaveServerResult> => {
      if (!isTrusted(event)) {
        throw new Error(REJECTED);
      }

      const normalized = normalizeServerUrl(url);

      if (!normalized.ok) {
        return { ok: false, reason: normalized.reason };
      }

      return save(normalized.url);
    },
  );
};
