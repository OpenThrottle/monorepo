import { describe, expect, it, vi } from 'vitest';

import type { ProbeOtServerResult } from '../server/probeOtServer.ts';
import { decideStart } from './decideStart.ts';

const HEALTH = { api: 'ok', database: 'ok', redis: 'ok', websocket: 'ok' };
const DEFAULT_URL = 'http://localhost:6021';

const build = (
  result: ProbeOtServerResult,
  urls: { envUrl?: string; settingsUrl?: string },
) => {
  const probe = vi.fn(() => Promise.resolve(result));

  return {
    probe,
    run: () =>
      decideStart({
        defaultUrl: DEFAULT_URL,
        envUrl: urls.envUrl,
        probe,
        settingsUrl: urls.settingsUrl,
      }),
  };
};

describe('decideStart', () => {
  describe('nothing configured', () => {
    it('shows the connection screen prefilled with the default, without probing', async () => {
      const { probe, run } = build({ health: HEALTH, ok: true }, {});

      expect(await run()).toEqual({
        kind: 'connect',
        notice: undefined,
        prefill: DEFAULT_URL,
      });
      expect(probe).not.toHaveBeenCalled();
    });
  });

  describe('a configured server that answers', () => {
    it('opens the app with the settings URL', async () => {
      const { run } = build(
        { health: HEALTH, ok: true },
        { settingsUrl: 'http://a.test' },
      );

      expect(await run()).toEqual({ kind: 'app', serverUrl: 'http://a.test' });
    });

    it('lets the env URL win over the settings URL', async () => {
      const { probe, run } = build(
        { health: HEALTH, ok: true },
        { envUrl: 'http://env.test', settingsUrl: 'http://a.test' },
      );

      expect(await run()).toEqual({
        kind: 'app',
        serverUrl: 'http://env.test',
      });
      expect(probe).toHaveBeenCalledWith('http://env.test');
    });
  });

  describe('a configured server that fails the probe', () => {
    it('shows the connection screen with the reason and the URL prefilled', async () => {
      const { run } = build(
        { ok: false, reason: 'down' },
        { settingsUrl: 'http://a.test' },
      );

      expect(await run()).toEqual({
        kind: 'connect',
        notice: 'down',
        prefill: 'http://a.test',
      });
    });
  });
});
