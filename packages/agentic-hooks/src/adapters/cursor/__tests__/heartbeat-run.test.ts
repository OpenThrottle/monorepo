import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HookFetch } from '../../../types.ts';
import {
  isCursorHeartbeatShadowed,
  runCursorHeartbeat,
} from '../heartbeat-run.ts';

describe('runCursorHeartbeat', () => {
  let home: string;
  let telemetryDir: string;
  let repo: string;
  let pluginRoot: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-hb-home-'));
    telemetryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-hb-tel-'));
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-hb-repo-'));
    pluginRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-hb-plugin-'));
    fs.mkdirSync(path.join(pluginRoot, '.cursor-plugin'));
    fs.writeFileSync(
      path.join(pluginRoot, '.cursor-plugin', 'plugin.json'),
      JSON.stringify({ name: 'openthrottle', version: '2.3.4' }),
    );

    vi.stubEnv('HOME', home);
    vi.stubEnv('OPENTHROTTLE_TELEMETRY_DIR', telemetryDir);
    vi.stubEnv('OPENTHROTTLE_MACHINE_LABEL', '');
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    for (const dir of [home, telemetryDir, repo, pluginRoot]) {
      fs.rmSync(dir, { force: true, recursive: true });
    }
  });

  const offline = { OPENTHROTTLE_TELEMETRY_OFFLINE: '1' };
  const ownScript = (): string => {
    return path.join(pluginRoot, 'hooks', 'skill-usage-heartbeat.cjs');
  };

  describe('when the hook is the repository registration', () => {
    it('reports source cursor, the repo leg and no plugin version', async () => {
      const fetchImpl = vi.fn<HookFetch>();

      const receipt = await runCursorHeartbeat({
        env: offline,
        fetchImpl,
        repoRoot: repo,
        scriptPath: path.join(repo, '.cursor', 'hooks', 'x.cjs'),
      });

      expect(fetchImpl).not.toHaveBeenCalled();
      expect(receipt).toMatchObject({ delivered: false, error: 'offline' });
      expect(receipt?.payload).toMatchObject({
        deliveryLeg: 'repo',
        marketplacePluginInstalled: null,
        marketplacePluginVersion: null,
        pluginVersion: null,
        source: 'cursor',
      });
    });
  });

  describe("when CURSOR_PLUGIN_ROOT names another plugin than the script's", () => {
    it('still reports the repo leg', async () => {
      const receipt = await runCursorHeartbeat({
        env: { ...offline, CURSOR_PLUGIN_ROOT: pluginRoot },
        repoRoot: repo,
        scriptPath: path.join(repo, '.cursor', 'hooks', 'x.cjs'),
      });

      expect(receipt?.payload).toMatchObject({
        deliveryLeg: 'repo',
        pluginVersion: null,
      });
    });
  });

  describe('when the script runs from its own plugin root', () => {
    it('reports the plugin-dir leg and the plugin version', async () => {
      const receipt = await runCursorHeartbeat({
        env: { ...offline, CURSOR_PLUGIN_ROOT: pluginRoot },
        repoRoot: repo,
        scriptPath: ownScript(),
      });

      expect(receipt?.payload).toMatchObject({
        deliveryLeg: 'plugin-dir',
        pluginVersion: '2.3.4',
      });
    });
  });

  describe('when the script runs from Cursor’s marketplace cache', () => {
    it('reports the marketplace leg and the installed version', async () => {
      const installRoot = path.join(
        home,
        '.cursor',
        'plugins',
        'cache',
        'openthrottle',
        'openthrottle',
        '3dbd22ff',
      );
      fs.mkdirSync(path.join(installRoot, '.cursor-plugin'), {
        recursive: true,
      });
      fs.writeFileSync(path.join(installRoot, '.cache-complete'), '');
      fs.writeFileSync(
        path.join(installRoot, '.cursor-plugin', 'plugin.json'),
        JSON.stringify({ name: 'openthrottle', version: '1.3.0' }),
      );

      const receipt = await runCursorHeartbeat({
        env: { ...offline, CURSOR_PLUGIN_ROOT: installRoot },
        homeDir: home,
        repoRoot: repo,
        scriptPath: path.join(installRoot, 'hooks', 'x.cjs'),
      });

      expect(receipt?.payload).toMatchObject({
        deliveryLeg: 'marketplace',
        marketplacePluginInstalled: true,
        marketplacePluginVersion: '1.3.0',
        pluginVersion: '1.3.0',
      });
    });
  });

  describe('when the driver stamped OPENTHROTTLE_HOOK_DELIVERY=plugin-dir', () => {
    it('reports the plugin-dir leg', async () => {
      const receipt = await runCursorHeartbeat({
        env: { ...offline, OPENTHROTTLE_HOOK_DELIVERY: 'plugin-dir' },
        repoRoot: repo,
        scriptPath: path.join(repo, 'x.cjs'),
      });

      expect(receipt?.payload.deliveryLeg).toBe('plugin-dir');
    });
  });
});

describe('isCursorHeartbeatShadowed', () => {
  let repo: string;
  let pluginRoot: string;

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-shadow-repo-'));
    pluginRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-shadow-plugin-'));
  });

  afterEach(() => {
    for (const dir of [repo, pluginRoot]) {
      fs.rmSync(dir, { force: true, recursive: true });
    }
  });

  const registerInRepo = (command: string): void => {
    fs.mkdirSync(path.join(repo, '.cursor'));
    fs.writeFileSync(
      path.join(repo, '.cursor', 'hooks.json'),
      JSON.stringify({ hooks: { sessionStart: [{ command }] }, version: 1 }),
    );
  };

  const pluginScript = (): string => {
    return path.join(pluginRoot, 'hooks', 'skill-usage-heartbeat.cjs');
  };

  describe('when the plugin copy runs in a repo that registers its own', () => {
    it('stands down', () => {
      registerInRepo('.cursor/hooks/skill-usage-heartbeat.cjs');

      expect(
        isCursorHeartbeatShadowed({
          env: { CURSOR_PLUGIN_ROOT: pluginRoot },
          repoRoot: repo,
          scriptPath: pluginScript(),
        }),
      ).toBe(true);
    });
  });

  describe('when the repo registers no heartbeat', () => {
    it('keeps sending', () => {
      registerInRepo('.cursor/hooks/skill-usage-capture.cjs');

      expect(
        isCursorHeartbeatShadowed({
          env: { CURSOR_PLUGIN_ROOT: pluginRoot },
          repoRoot: repo,
          scriptPath: pluginScript(),
        }),
      ).toBe(false);
    });
  });

  describe('when the repo registers this same plugin payload', () => {
    it('keeps sending, since standing down would leave no copy to send', () => {
      registerInRepo(pluginScript());

      expect(
        isCursorHeartbeatShadowed({
          env: { CURSOR_PLUGIN_ROOT: pluginRoot },
          repoRoot: repo,
          scriptPath: path.join(
            pluginRoot,
            'dist',
            'skill-usage-heartbeat.cjs',
          ),
        }),
      ).toBe(false);
    });
  });

  describe('when the running copy is the repo registration', () => {
    it('keeps sending', () => {
      registerInRepo('.cursor/hooks/skill-usage-heartbeat.cjs');

      expect(
        isCursorHeartbeatShadowed({
          env: { CURSOR_PLUGIN_ROOT: pluginRoot },
          repoRoot: repo,
          scriptPath: path.join(repo, '.cursor', 'hooks', 'x.cjs'),
        }),
      ).toBe(false);
    });
  });
});
