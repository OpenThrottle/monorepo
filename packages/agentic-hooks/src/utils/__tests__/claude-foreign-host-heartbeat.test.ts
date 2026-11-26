import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isForeignHostHeartbeatShadowed,
  runForeignHostHeartbeat,
} from '../claude-heartbeat.ts';

const writeFile = (filePath: string, text: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
};

describe('foreign-host heartbeat', () => {
  let home: string;
  let telemetryDir: string;
  let repo: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'fh-home-'));
    telemetryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fh-tel-'));
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'fh-repo-'));
    execFileSync('git', ['init', '-q'], { cwd: repo });

    vi.stubEnv('HOME', home);
    vi.stubEnv('OPENTHROTTLE_TELEMETRY_DIR', telemetryDir);
    vi.stubEnv('OPENTHROTTLE_GRAPHQL_URL', undefined);
    vi.stubEnv('OPENTHROTTLE_SERVER_APP_URL', undefined);
    vi.stubEnv('OPENTHROTTLE_TELEMETRY_OFFLINE', '');
    vi.stubEnv('OPENTHROTTLE_MACHINE_LABEL', '');
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    for (const dir of [home, telemetryDir, repo]) {
      fs.rmSync(dir, { force: true, recursive: true });
    }
  });

  describe('runForeignHostHeartbeat', () => {
    describe('when cursor-agent runs the Claude-installed plugin', () => {
      it('reports source cursor, the marketplace leg and the Claude install record', async () => {
        const root = path.join(
          home,
          '.claude/plugins/cache/openthrottle/openthrottle/1.3.1',
        );
        writeFile(
          path.join(root, '.claude-plugin/plugin.json'),
          JSON.stringify({ version: '1.3.1' }),
        );
        writeFile(
          path.join(home, '.claude/plugins/installed_plugins.json'),
          JSON.stringify({
            plugins: { 'openthrottle@openthrottle': [{ version: '1.3.1' }] },
          }),
        );

        const receipt = await runForeignHostHeartbeat({
          env: { CLAUDE_PLUGIN_ROOT: root, CURSOR_PLUGIN_ROOT: root },
          homeDir: home,
          host: 'cursor',
          repoRoot: repo,
          scriptPath: path.join(root, 'hooks/skill-usage-heartbeat.cjs'),
        });

        expect(receipt?.payload).toMatchObject({
          deliveryLeg: 'marketplace',
          marketplacePluginInstalled: true,
          marketplacePluginVersion: '1.3.1',
          pluginVersion: '1.3.1',
          source: 'cursor',
        });
      });
    });

    describe('when codex runs its marketplace install', () => {
      it('reports source codex and reads config.toml', async () => {
        const codexHome = path.join(home, '.codex');
        const root = path.join(
          codexHome,
          'plugins/cache/openthrottle/openthrottle/1.3.1',
        );
        writeFile(
          path.join(root, '.claude-plugin/plugin.json'),
          JSON.stringify({ version: '1.3.1' }),
        );
        writeFile(
          path.join(codexHome, 'config.toml'),
          '[plugins."openthrottle@openthrottle"]\nenabled = true\n',
        );

        const receipt = await runForeignHostHeartbeat({
          env: { CLAUDE_PLUGIN_ROOT: root, PLUGIN_ROOT: root },
          homeDir: home,
          host: 'codex',
          repoRoot: repo,
          scriptPath: path.join(root, 'hooks/skill-usage-heartbeat.cjs'),
        });

        expect(receipt?.payload).toMatchObject({
          deliveryLeg: 'marketplace',
          marketplacePluginInstalled: true,
          pluginVersion: '1.3.1',
          source: 'codex',
        });
      });
    });

    describe('when agy runs an imported copy', () => {
      it('reports source antigravity from the plugin folder', async () => {
        const root = path.join(home, '.gemini/config/plugins/openthrottle');
        writeFile(
          path.join(root, 'plugin.json'),
          JSON.stringify({ version: '1.3.1' }),
        );

        const receipt = await runForeignHostHeartbeat({
          env: {},
          homeDir: home,
          host: 'antigravity',
          repoRoot: repo,
          scriptPath: path.join(root, 'hooks/skill-usage-heartbeat.cjs'),
        });

        expect(receipt?.payload).toMatchObject({
          deliveryLeg: 'marketplace',
          marketplacePluginInstalled: true,
          marketplacePluginVersion: '1.3.1',
          pluginVersion: '1.3.1',
          source: 'antigravity',
        });
      });
    });
  });

  describe('isForeignHostHeartbeatShadowed', () => {
    const root = (): string => {
      return path.join(home, '.claude/plugins/cache/o/o/1');
    };

    describe('under cursor', () => {
      it('stands down when the repo .cursor/hooks.json registers the heartbeat', () => {
        writeFile(
          path.join(repo, '.cursor/hooks.json'),
          JSON.stringify({
            hooks: {
              sessionStart: [
                { command: '.cursor/hooks/skill-usage-heartbeat.cjs' },
              ],
            },
          }),
        );

        expect(
          isForeignHostHeartbeatShadowed({
            env: { CLAUDE_PLUGIN_ROOT: root(), CURSOR_PLUGIN_ROOT: root() },
            homeDir: home,
            host: 'cursor',
            repoRoot: repo,
            scriptPath: path.join(root(), 'hooks/skill-usage-heartbeat.cjs'),
          }),
        ).toBe(true);
      });

      it('sends when only .claude/settings.json registers it', () => {
        writeFile(
          path.join(repo, '.claude/settings.json'),
          JSON.stringify({
            hooks: { SessionStart: ['./.claude/hooks/skill-usage-heartbeat'] },
          }),
        );

        expect(
          isForeignHostHeartbeatShadowed({
            env: { CLAUDE_PLUGIN_ROOT: root(), CURSOR_PLUGIN_ROOT: root() },
            homeDir: home,
            host: 'cursor',
            repoRoot: repo,
            scriptPath: path.join(root(), 'hooks/skill-usage-heartbeat.cjs'),
          }),
        ).toBe(false);
      });
    });

    describe('under codex', () => {
      it('stands down when the home config.toml registers the heartbeat', () => {
        writeFile(
          path.join(home, '.codex/config.toml'),
          '[[hooks.SessionStart]]\ncommand = "node /x/skill-usage-heartbeat.cjs"\n',
        );

        expect(
          isForeignHostHeartbeatShadowed({
            env: {},
            homeDir: home,
            host: 'codex',
            repoRoot: repo,
          }),
        ).toBe(true);
      });

      it('sends when nothing registers it', () => {
        expect(
          isForeignHostHeartbeatShadowed({
            env: {},
            homeDir: home,
            host: 'codex',
            repoRoot: repo,
          }),
        ).toBe(false);
      });
    });

    describe('under agy', () => {
      it('stands down when a workspace plugin registers the heartbeat', () => {
        writeFile(
          path.join(repo, '.agents/plugins/openthrottle/hooks.json'),
          '{"SessionStart":[{"command":"node ./hooks/skill-usage-heartbeat.cjs"}]}',
        );

        expect(
          isForeignHostHeartbeatShadowed({
            env: {},
            homeDir: home,
            host: 'antigravity',
            repoRoot: repo,
          }),
        ).toBe(true);
      });

      it('sends when the repo has no workspace plugin', () => {
        expect(
          isForeignHostHeartbeatShadowed({
            env: {},
            homeDir: home,
            host: 'antigravity',
            repoRoot: repo,
          }),
        ).toBe(false);
      });
    });
  });
});
