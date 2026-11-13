import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HookFetch } from '../../../types.ts';
import { runHeartbeat } from '../heartbeat-run.ts';

const git = (cwd: string, ...args: string[]): string => {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
};

const listTree = (root: string): string[] => {
  return fs.readdirSync(root, { recursive: true }).map(String).sort();
};

describe('runHeartbeat', () => {
  let home: string;
  let telemetryDir: string;
  let repo: string;
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-home-'));
    telemetryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-tel-'));
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-repo-'));
    git(repo, 'init', '-q');
    git(
      repo,
      'remote',
      'add',
      'origin',
      'https://user:ghp_secret@GitHub.com/org/repo.git',
    );
    fs.writeFileSync(path.join(repo, 'README.md'), 'hello\n');

    vi.stubEnv('HOME', home);
    vi.stubEnv('OPENTHROTTLE_TELEMETRY_DIR', telemetryDir);
    vi.stubEnv('OPENTHROTTLE_GRAPHQL_URL', '');
    vi.stubEnv('OPENTHROTTLE_SERVER_APP_URL', '');
    vi.stubEnv('OPENTHROTTLE_TELEMETRY_OFFLINE', '');
    vi.stubEnv('OPENTHROTTLE_MACHINE_LABEL', '');
    vi.stubEnv('CLAUDE_CONFIG_DIR', '');
    stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    for (const dir of [home, telemetryDir, repo]) {
      fs.rmSync(dir, { force: true, recursive: true });
    }
  });

  const receiptPath = (): string => {
    return path.join(telemetryDir, 'last-heartbeat.json');
  };

  describe('when no endpoint resolves', () => {
    it('makes no network call, writes no stderr, and records an undelivered receipt', async () => {
      const fetchImpl = vi.fn<HookFetch>();

      const receipt = await runHeartbeat({
        env: {},
        fetchImpl,
        repoRoot: repo,
      });

      expect(fetchImpl).not.toHaveBeenCalled();
      expect(stderr).not.toHaveBeenCalled();
      expect(receipt).toMatchObject({ delivered: false, error: 'no endpoint' });
      expect(fs.existsSync(receiptPath())).toBe(true);
      expect(
        fs.existsSync(path.join(home, '.openthrottle', 'machine-id')),
      ).toBe(true);
    });
  });

  describe('when OPENTHROTTLE_TELEMETRY_OFFLINE=1', () => {
    it('posts nothing even with an endpoint', async () => {
      vi.stubEnv('OPENTHROTTLE_GRAPHQL_URL', 'http://127.0.0.1:1/graphql');
      vi.stubEnv('OPENTHROTTLE_TELEMETRY_OFFLINE', '1');
      const fetchImpl = vi.fn<HookFetch>();

      const receipt = await runHeartbeat({
        env: { OPENTHROTTLE_TELEMETRY_OFFLINE: '1' },
        fetchImpl,
        repoRoot: repo,
      });

      expect(fetchImpl).not.toHaveBeenCalled();
      expect(receipt).toMatchObject({ delivered: false, error: 'offline' });
    });
  });

  describe('when the endpoint is reachable', () => {
    it('posts the mutation with a payload free of paths, emails and hostnames', async () => {
      vi.stubEnv('OPENTHROTTLE_GRAPHQL_URL', 'http://127.0.0.1:1/graphql');
      vi.stubEnv('OPENTHROTTLE_MACHINE_LABEL', ' work laptop ');
      const fetchImpl = vi.fn<HookFetch>(async () => {
        return new Response(
          JSON.stringify({
            data: { recordTelemetryHeartbeat: { id: 'hb-1' } },
          }),
          { status: 200 },
        );
      });

      const receipt = await runHeartbeat({
        env: {},
        fetchImpl,
        repoRoot: repo,
      });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(receipt).toMatchObject({ delivered: true, error: null });
      expect(receipt?.payload).toMatchObject({
        deliveryLeg: 'repo',
        machineLabel: 'work laptop',
        marketplacePluginInstalled: null,
        pluginVersion: null,
        repoIdentity: 'https://github.com/org/repo',
        source: 'claude-code',
      });

      const [, init] = fetchImpl.mock.calls[0] ?? [];
      const sent = String(init?.body);
      const onDisk = fs.readFileSync(receiptPath(), 'utf8');
      for (const text of [sent, onDisk]) {
        expect(text).not.toContain(repo);
        expect(text).not.toContain(home);
        expect(text).not.toContain(os.hostname());
        expect(text).not.toContain(os.userInfo().username);
        expect(text).not.toContain('ghp_secret');
        expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
      }
    });
  });

  describe('when the endpoint is unreachable', () => {
    it('warns at most once on stderr and still records the attempt', async () => {
      vi.stubEnv('OPENTHROTTLE_GRAPHQL_URL', 'http://127.0.0.1:1/graphql');
      const fetchImpl = vi.fn<HookFetch>(async () => {
        throw new Error('connect ECONNREFUSED');
      });

      const receipt = await runHeartbeat({
        env: {},
        fetchImpl,
        repoRoot: repo,
      });

      expect(receipt).toMatchObject({ delivered: false });
      expect(stderr.mock.calls.length).toBeLessThanOrEqual(1);
      expect(fs.existsSync(receiptPath())).toBe(true);
    });
  });

  describe('when the repository has no remote', () => {
    it('sends a null repoIdentity', async () => {
      git(repo, 'remote', 'remove', 'origin');

      const receipt = await runHeartbeat({ env: {}, repoRoot: repo });

      expect(receipt?.payload.repoIdentity).toBeNull();
    });
  });

  describe('when the marketplace plugin is installed', () => {
    it('reads installed_plugins.json under CLAUDE_CONFIG_DIR', async () => {
      const configDir = path.join(home, 'cfg');
      fs.mkdirSync(path.join(configDir, 'plugins'), { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'plugins', 'installed_plugins.json'),
        JSON.stringify({
          plugins: { 'openthrottle@openthrottle': [{ version: '1.1.0' }] },
        }),
      );
      vi.stubEnv('CLAUDE_CONFIG_DIR', configDir);

      const receipt = await runHeartbeat({
        env: { CLAUDE_CONFIG_DIR: configDir },
        repoRoot: repo,
      });

      expect(receipt?.payload).toMatchObject({
        marketplacePluginInstalled: true,
        marketplacePluginVersion: '1.1.0',
      });
    });
  });

  describe('when the machine id cannot be created', () => {
    it('skips the heartbeat', async () => {
      fs.writeFileSync(path.join(home, '.openthrottle'), 'a file, not a dir');
      const fetchImpl = vi.fn<HookFetch>();

      const receipt = await runHeartbeat({
        env: {},
        fetchImpl,
        repoRoot: repo,
      });

      expect(receipt).toBeNull();
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe('non-mutation (contract §4)', () => {
    it('leaves the scratch repository byte-for-byte untouched', async () => {
      vi.stubEnv('OPENTHROTTLE_GRAPHQL_URL', 'http://127.0.0.1:1/graphql');
      const treeBefore = listTree(repo);
      const statusBefore = git(repo, 'status', '--porcelain');
      const readmeBefore = fs.readFileSync(
        path.join(repo, 'README.md'),
        'utf8',
      );

      await runHeartbeat({ repoRoot: repo, timeoutMs: 200 });

      expect(listTree(repo)).toEqual(treeBefore);
      expect(git(repo, 'status', '--porcelain')).toBe(statusBefore);
      expect(fs.readFileSync(path.join(repo, 'README.md'), 'utf8')).toBe(
        readmeBefore,
      );
    });
  });
});
