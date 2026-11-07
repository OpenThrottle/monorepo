import { describe, expect, it, vi } from 'vitest';

import { SHELL_IPC_CHANNELS } from '../../bridge/data/data.shell-channels.ts';
import { registerShellIpc } from './register-shell-ipc.ts';

const SHELL_URL = 'file:///app/out/renderer/index.html';
const HEALTH = { api: 'ok', database: 'ok', redis: 'ok', websocket: 'ok' };

const build = () => {
  const handlers = new Map<string, (...args: never[]) => unknown>();
  const probe = vi.fn(() =>
    Promise.resolve({ health: HEALTH, ok: true as const }),
  );
  const save = vi.fn((url: string) =>
    Promise.resolve({ ok: true as const, url }),
  );

  registerShellIpc({
    getSettings: () =>
      Promise.resolve({ notice: undefined, serverUrl: 'http://x.test' }),
    ipcMain: {
      handle: (channel, handler) => {
        handlers.set(channel, handler);
      },
    },
    probe,
    save,
    shellUrl: SHELL_URL,
  });

  const frame = { url: SHELL_URL };
  const trusted = { sender: { mainFrame: frame }, senderFrame: frame };
  const foreign = {
    sender: { mainFrame: frame },
    senderFrame: { url: 'http://127.0.0.1:5000/auth' },
  };

  const call = (
    channel: string,
    event: object,
    ...args: unknown[]
  ): unknown => {
    const handler = handlers.get(channel);

    return Reflect.apply(handler ?? (() => undefined), undefined, [
      event,
      ...args,
    ]);
  };

  return { call, foreign, probe, save, trusted };
};

describe('registerShellIpc', () => {
  it('registers the three shell channels', () => {
    const handled: string[] = [];

    registerShellIpc({
      getSettings: () => Promise.resolve({ notice: undefined, serverUrl: '' }),
      ipcMain: { handle: (channel) => void handled.push(channel) },
      probe: vi.fn(),
      save: vi.fn(),
      shellUrl: SHELL_URL,
    });

    expect(handled.sort()).toEqual(Object.values(SHELL_IPC_CHANNELS).sort());
  });

  describe('sender validation', () => {
    it.each(Object.values(SHELL_IPC_CHANNELS))(
      'rejects the developer origin on %s',
      async (channel) => {
        const { call, foreign, probe, save } = build();

        await expect(call(channel, foreign, 'http://a.test')).rejects.toThrow(
          'Request rejected.',
        );
        expect(probe).not.toHaveBeenCalled();
        expect(save).not.toHaveBeenCalled();
      },
    );

    it('rejects a missing sender frame', async () => {
      const { call } = build();

      await expect(
        call(SHELL_IPC_CHANNELS.getSettings, {
          sender: { mainFrame: {} },
          senderFrame: null,
        }),
      ).rejects.toThrow('Request rejected.');
    });
  });

  describe('argument validation', () => {
    it.each([[42], [undefined], ['ftp://a.test'], ['not a url']])(
      'testServer rejects %s without probing',
      async (arg) => {
        const { call, probe, trusted } = build();
        const result = await call(SHELL_IPC_CHANNELS.testServer, trusted, arg);

        expect(result).toMatchObject({ ok: false });
        expect(probe).not.toHaveBeenCalled();
      },
    );

    it('saveServer rejects an invalid URL without saving', async () => {
      const { call, save, trusted } = build();
      const result = await call(
        SHELL_IPC_CHANNELS.saveServer,
        trusted,
        'javascript:1',
      );

      expect(result).toMatchObject({ ok: false });
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('trusted calls', () => {
    it('testServer probes the normalized origin', async () => {
      const { call, probe, trusted } = build();
      const result = await call(
        SHELL_IPC_CHANNELS.testServer,
        trusted,
        'http://a.test:1/x',
      );

      expect(probe).toHaveBeenCalledWith('http://a.test:1');
      expect(result).toEqual({
        health: HEALTH,
        ok: true,
        url: 'http://a.test:1',
      });
    });

    it('saveServer saves the normalized origin', async () => {
      const { call, save, trusted } = build();

      await call(SHELL_IPC_CHANNELS.saveServer, trusted, 'http://a.test:1/');

      expect(save).toHaveBeenCalledWith('http://a.test:1');
    });

    it('getSettings returns the connection context', async () => {
      const { call, trusted } = build();

      expect(await call(SHELL_IPC_CHANNELS.getSettings, trusted)).toEqual({
        notice: undefined,
        serverUrl: 'http://x.test',
      });
    });
  });
});
