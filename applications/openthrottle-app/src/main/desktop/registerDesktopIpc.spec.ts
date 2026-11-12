import { DESKTOP_IPC_CHANNELS } from '@openthrottle/openthrottle-desktop-bridge';
import { describe, expect, it, vi } from 'vitest';

import { registerDesktopIpc } from './registerDesktopIpc.ts';

const ORIGIN = 'http://127.0.0.1:5000';

const build = (origin: string | null = ORIGIN) => {
  const handlers = new Map<string, (...args: never[]) => unknown>();
  const listeners = new Map<string, (...args: never[]) => unknown>();
  const notify = vi.fn(() => ({ ok: true as const, shown: true }));
  const openExternal = vi.fn();

  registerDesktopIpc({
    getAppOrigin: () => origin ?? undefined,
    ipcMain: {
      handle: (channel, handler) => {
        handlers.set(channel, handler);
      },
      on: (channel, listener) => {
        listeners.set(channel, listener);
      },
    },
    notify,
    openExternal,
    platform: 'darwin',
    version: '9.9.9',
  });

  const frame = { url: `${ORIGIN}/plans` };
  const trusted = { sender: { mainFrame: frame }, senderFrame: frame };
  const foreign = {
    sender: { mainFrame: frame },
    senderFrame: { url: 'file:///app/out/renderer/index.html' },
  };

  const call = (map: typeof handlers, channel: string, ...args: unknown[]) => {
    return Reflect.apply(
      map.get(channel) ?? (() => undefined),
      undefined,
      args,
    );
  };

  const invoke = (channel: string, ...args: unknown[]): unknown => {
    return call(handlers, channel, ...args);
  };

  const handshake = (event: object): unknown => {
    const mutable: Record<string, unknown> = {
      ...event,
      returnValue: undefined,
    };

    call(listeners, DESKTOP_IPC_CHANNELS.handshake, mutable);

    return mutable.returnValue;
  };

  return { call: invoke, foreign, handshake, notify, openExternal, trusted };
};

describe('registerDesktopIpc', () => {
  describe('handshake', () => {
    it('allows the app origin and reports platform and version', () => {
      const { handshake, trusted } = build();

      expect(handshake(trusted)).toEqual({
        allowed: true,
        platform: 'darwin',
        version: '9.9.9',
      });
    });

    it('denies the connection screen', () => {
      const { foreign, handshake } = build();

      expect(handshake(foreign)).toEqual({ allowed: false });
    });

    it('denies everything before an app origin exists', () => {
      const { handshake, trusted } = build(null);

      expect(handshake(trusted)).toEqual({ allowed: false });
    });
  });

  describe('openExternal', () => {
    it('opens an https URL from the app', () => {
      const { call, openExternal, trusted } = build();

      expect(
        call(DESKTOP_IPC_CHANNELS.openExternal, trusted, 'https://example.com'),
      ).toEqual({ ok: true });
      expect(openExternal).toHaveBeenCalledWith('https://example.com/');
    });

    it.each([
      'file:///etc/passwd',
      'javascript:alert(1)',
      'mailto:a@b.c',
      42,
      undefined,
    ])('refuses %s', (url) => {
      const { call, openExternal, trusted } = build();

      expect(
        call(DESKTOP_IPC_CHANNELS.openExternal, trusted, url),
      ).toMatchObject({ ok: false });
      expect(openExternal).not.toHaveBeenCalled();
    });

    it('refuses a foreign sender', () => {
      const { call, foreign, openExternal } = build();

      expect(
        call(DESKTOP_IPC_CHANNELS.openExternal, foreign, 'https://example.com'),
      ).toMatchObject({ ok: false });
      expect(openExternal).not.toHaveBeenCalled();
    });
  });

  describe('notify', () => {
    it('forwards a valid request', () => {
      const { call, notify, trusted } = build();

      call(DESKTOP_IPC_CHANNELS.notify, trusted, { body: 'b', title: 't' });

      expect(notify).toHaveBeenCalledWith({
        body: 'b',
        link: undefined,
        title: 't',
      });
    });

    it('rejects a malformed request and a foreign sender', () => {
      const { call, foreign, notify, trusted } = build();

      expect(call(DESKTOP_IPC_CHANNELS.notify, trusted, 'x')).toMatchObject({
        ok: false,
      });
      expect(
        call(DESKTOP_IPC_CHANNELS.notify, foreign, { title: 't' }),
      ).toMatchObject({ ok: false });
      expect(notify).not.toHaveBeenCalled();
    });
  });
});
