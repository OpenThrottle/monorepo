import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DoctorCheck } from '../doctor-checks.ts';
import {
  renderDoctorHuman,
  renderDoctorJson,
  type Scrubber,
} from '../doctor-render.ts';
import {
  collectChecks,
  type DoctorFetch,
  originOf,
  probeHealth,
  resolvePayloadVersion,
} from '../doctor-run.ts';

const FAKE_TOKEN = 'ot_tok_SUPERSECRET123456';
const FAKE_EMAIL = 'someone@example.com';

const okFetch: DoctorFetch = () => {
  return Promise.resolve({ ok: true, status: 200 });
};

describe('doctor against a fixture HOME', () => {
  let home: string;
  let telemetryDir: string;
  let scriptDir: string;
  let scriptPath: string;

  const writeRegistry = (version: string | null): void => {
    const dir = path.join(home, '.claude', 'plugins');
    fs.mkdirSync(dir, { recursive: true });
    const entries = version === null ? [] : [{ version }];
    const plugins =
      version === null ? {} : { 'openthrottle@openthrottle': entries };
    fs.writeFileSync(
      path.join(dir, 'installed_plugins.json'),
      JSON.stringify({ plugins, version: 2 }),
    );
  };

  const writeUserEnv = (lines: readonly string[]): void => {
    const dir = path.join(home, '.openthrottle');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.env'), `${lines.join('\n')}\n`);
  };

  const writeJsonl = (name: string, lines: readonly object[]): void => {
    fs.mkdirSync(telemetryDir, { recursive: true });
    fs.writeFileSync(
      path.join(telemetryDir, name),
      lines.map((line) => JSON.stringify(line)).join('\n') + '\n',
    );
  };

  const run = async (
    fetchImpl: DoctorFetch = okFetch,
  ): Promise<Record<string, DoctorCheck>> => {
    const checks = await collectChecks({
      fetchImpl,
      now: () => Date.parse('2026-11-13T12:00:00.000Z'),
      repoRoot: home,
      scriptPath,
    });
    return Object.fromEntries(checks.map((check) => [check.id, check]));
  };

  beforeEach(() => {
    home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'doc-home-')));
    telemetryDir = path.join(home, '.openthrottle', 'skill-usage');
    scriptDir = path.join(home, 'plugin', 'hooks');
    fs.mkdirSync(scriptDir, { recursive: true });
    scriptPath = path.join(scriptDir, 'skill-usage-doctor.cjs');
    vi.stubEnv('HOME', home);
    vi.stubEnv('CLAUDE_CONFIG_DIR', '');
    vi.stubEnv('OPENTHROTTLE_TELEMETRY_DIR', '');
    vi.stubEnv('OPENTHROTTLE_GRAPHQL_URL', '');
    vi.stubEnv('OPENTHROTTLE_WORKER_GRAPHQL_URL', '');
    vi.stubEnv('OPENTHROTTLE_SERVER_APP_URL', '');
    vi.stubEnv('OPENTHROTTLE_MCP_AUTH_TOKEN', '');
    vi.stubEnv('OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', '');
    vi.stubEnv('OPENTHROTTLE_TELEMETRY_OFFLINE', '');
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fs.rmSync(home, { force: true, recursive: true });
  });

  describe('plugin', () => {
    it('warns when the registry is absent', async () => {
      expect((await run()).plugin?.status).toBe('WARN');
    });

    it('warns when the plugin is not in the registry', async () => {
      writeRegistry(null);
      expect((await run()).plugin?.status).toBe('WARN');
    });

    it('warns when older than the payload manifest next to the bundle', async () => {
      writeRegistry('1.1.0');
      fs.mkdirSync(path.join(home, 'plugin', '.claude-plugin'), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(home, 'plugin', '.claude-plugin', 'plugin.json'),
        JSON.stringify({ name: 'openthrottle', version: '1.2.0' }),
      );
      const checks = await run();
      expect(checks.plugin?.status).toBe('WARN');
      expect(checks.plugin?.fix).toContain('claude plugin update');
    });

    it('passes when installed and no payload manifest is readable', async () => {
      writeRegistry('1.2.0');
      expect((await run()).plugin?.status).toBe('PASS');
    });

    it('honors CLAUDE_CONFIG_DIR', async () => {
      const cfg = path.join(home, 'elsewhere');
      fs.mkdirSync(path.join(cfg, 'plugins'), { recursive: true });
      fs.writeFileSync(
        path.join(cfg, 'plugins', 'installed_plugins.json'),
        JSON.stringify({
          plugins: { 'openthrottle@openthrottle': [{ version: '1.2.0' }] },
        }),
      );
      vi.stubEnv('CLAUDE_CONFIG_DIR', cfg);
      expect((await run()).plugin?.status).toBe('PASS');
    });
  });

  describe('endpoint and token', () => {
    it('fails both when nothing is configured', async () => {
      const checks = await run();
      expect(checks.endpoint?.status).toBe('FAIL');
      expect(checks.token?.status).toBe('FAIL');
      expect(checks.reachability?.status).toBe('WARN');
    });

    it('fails only the token when just the URL is set', async () => {
      writeUserEnv(['OPENTHROTTLE_GRAPHQL_URL=http://localhost:6021/graphql']);
      const checks = await run();
      expect(checks.endpoint?.status).toBe('PASS');
      expect(checks.endpoint?.detail).toContain('~/.openthrottle/.env');
      expect(checks.token?.status).toBe('FAIL');
    });

    it('reports the process env layer and token presence', async () => {
      vi.stubEnv('OPENTHROTTLE_GRAPHQL_URL', 'http://localhost:6021/graphql');
      vi.stubEnv('OPENTHROTTLE_MCP_AUTH_TOKEN', FAKE_TOKEN);
      const checks = await run();
      expect(checks.endpoint?.detail).toContain('process env');
      expect(checks.token?.detail).toBe('present (from process env)');
      expect(JSON.stringify(checks)).not.toContain(FAKE_TOKEN);
    });
  });

  describe('reachability', () => {
    beforeEach(() => {
      writeUserEnv([
        'OPENTHROTTLE_GRAPHQL_URL=http://localhost:6021/graphql',
        `OPENTHROTTLE_MCP_AUTH_TOKEN=${FAKE_TOKEN}`,
      ]);
    });

    it('passes on 200 and probes <origin>/health', async () => {
      const seen: string[] = [];
      const fetchImpl: DoctorFetch = (url) => {
        seen.push(url);
        return Promise.resolve({ ok: true, status: 200 });
      };
      expect((await run(fetchImpl)).reachability?.status).toBe('PASS');
      expect(seen).toEqual(['http://127.0.0.1:6021/health']);
    });

    it('fails on non-2xx', async () => {
      const checks = await run(() =>
        Promise.resolve({ ok: false, status: 502 }),
      );
      expect(checks.reachability?.status).toBe('FAIL');
      expect(checks.reachability?.detail).toContain('502');
    });

    it('fails on timeout', async () => {
      const checks = await run(() => {
        const error = new Error('aborted');
        error.name = 'TimeoutError';
        return Promise.reject(error);
      });
      expect(checks.reachability?.status).toBe('FAIL');
      expect(checks.reachability?.detail).toContain('timed out');
    });
  });

  describe('buffer', () => {
    beforeEach(() => {
      writeUserEnv(['OPENTHROTTLE_GRAPHQL_URL=http://localhost:6021/graphql']);
    });

    it('passes when empty', async () => {
      expect((await run()).buffer?.status).toBe('PASS');
    });

    it('warns with the sibling drain command when populated and healthy', async () => {
      writeJsonl('events.jsonl', [{ occurred_at: '2026-11-13T11:00:00Z' }]);
      const checks = await run();
      expect(checks.buffer?.status).toBe('WARN');
      expect(checks.buffer?.fix).toBe(
        `node ${path.join(scriptDir, 'skill-usage-drain.cjs')}`,
      );
    });

    it('warns with --replay-dead-letter when dead letters exist', async () => {
      writeJsonl('events.dead-letter.jsonl', [
        { occurred_at: '2026-11-13T11:00:00Z' },
      ]);
      const checks = await run();
      expect(checks.buffer?.status).toBe('WARN');
      expect(checks.buffer?.fix).toContain('--replay-dead-letter');
    });
  });

  describe('heartbeat', () => {
    const writeReceipt = (receipt: object): void => {
      fs.mkdirSync(telemetryDir, { recursive: true });
      fs.writeFileSync(
        path.join(telemetryDir, 'last-heartbeat.json'),
        JSON.stringify(receipt),
      );
    };

    it('warns when missing', async () => {
      expect((await run()).heartbeat?.status).toBe('WARN');
    });

    it('warns with the error when undelivered', async () => {
      writeReceipt({
        attemptedAt: '2026-11-13T10:00:00.000Z',
        delivered: false,
        error: 'no endpoint',
      });
      const checks = await run();
      expect(checks.heartbeat?.status).toBe('WARN');
      expect(checks.heartbeat?.detail).toContain('no endpoint');
    });

    it('passes when delivered', async () => {
      writeReceipt({
        attemptedAt: '2026-11-13T10:00:00.000Z',
        delivered: true,
        error: null,
      });
      expect((await run()).heartbeat?.status).toBe('PASS');
    });
  });

  describe('offline switch', () => {
    it('warns when OPENTHROTTLE_TELEMETRY_OFFLINE=1', async () => {
      vi.stubEnv('OPENTHROTTLE_TELEMETRY_OFFLINE', '1');
      expect((await run()).offline?.status).toBe('WARN');
    });

    it('passes otherwise', async () => {
      expect((await run()).offline?.status).toBe('PASS');
    });
  });

  describe('privacy of rendered output', () => {
    it('never contains the token, an email or the HOME path', async () => {
      writeUserEnv([
        `OPENTHROTTLE_GRAPHQL_URL=http://localhost:6021/graphql`,
        `OPENTHROTTLE_MCP_AUTH_TOKEN=${FAKE_TOKEN}`,
      ]);
      writeJsonl('events.jsonl', [{ occurred_at: '2026-11-10T11:00:00Z' }]);
      fs.writeFileSync(
        path.join(telemetryDir, 'last-heartbeat.json'),
        JSON.stringify({
          attemptedAt: '2026-11-13T10:00:00.000Z',
          delivered: false,
          error: `failed for ${FAKE_EMAIL} at ${home}/x with ${FAKE_TOKEN}`,
        }),
      );
      const checks = await run(() => Promise.reject(new Error(`boom ${home}`)));
      const scrubber: Scrubber = {
        homeDirs: [home],
        hostname: os.hostname(),
        token: FAKE_TOKEN,
      };
      for (const output of [
        renderDoctorHuman(Object.values(checks), scrubber),
        renderDoctorJson(Object.values(checks), scrubber),
      ]) {
        expect(output).not.toContain(FAKE_TOKEN);
        expect(output).not.toContain(FAKE_EMAIL);
        expect(output).not.toContain(home);
      }
      expect(renderDoctorHuman(Object.values(checks), scrubber)).toContain(
        '~/',
      );
    });
  });
});

describe('renderDoctorHuman and renderDoctorJson shape', () => {
  const scrubber: Scrubber = { homeDirs: [], hostname: null, token: null };
  const checks: readonly DoctorCheck[] = [
    { detail: 'fine', fix: null, id: 'plugin', status: 'PASS' },
    { detail: 'bad', fix: 'do this\nthen that', id: 'token', status: 'FAIL' },
  ];

  it('aligns lines and prints a Fixes block', () => {
    const out = renderDoctorHuman(checks, scrubber);
    expect(out).toContain('PASS  plugin        fine');
    expect(out).toContain('FAIL  token         bad');
    expect(out).toContain('Fixes\n  token\n    do this\n    then that');
  });

  it('emits { checks, summary } JSON', () => {
    const parsed: unknown = JSON.parse(renderDoctorJson(checks, scrubber));
    expect(parsed).toEqual({
      checks,
      summary: { fail: 1, pass: 1, warn: 0 },
    });
  });
});

describe('probeHealth', () => {
  it('maps an AbortError to a timeout', async () => {
    const error = new Error('x');
    error.name = 'AbortError';
    const probe = await probeHealth({
      fetchImpl: () => Promise.reject(error),
      now: () => 0,
      origin: 'http://localhost:1',
    });
    expect(probe).toEqual({ kind: 'timeout' });
  });
});

describe('originOf and resolvePayloadVersion', () => {
  it('drops userinfo, path and query', () => {
    expect(originOf('https://u:p@host.test:8080/graphql?x=1')).toBe(
      'https://host.test:8080',
    );
    expect(originOf('not a url')).toBeNull();
  });

  it('is null when no manifest is readable', () => {
    expect(resolvePayloadVersion('/nonexistent/hooks/x.cjs')).toBeNull();
  });
});
