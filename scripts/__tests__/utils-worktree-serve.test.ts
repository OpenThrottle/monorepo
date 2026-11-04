import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildProbe,
  currentLaunchLog,
  descendantPids,
  isInsideWorktree,
  launchHeader,
  logPath,
  nxArgv,
  nxLockWaits,
  nxTaskId,
  nxTaskIds,
  parseLsofCwd,
  parsePidRecord,
  parsePids,
  parsePortBase,
  parseProcessTable,
  parseServeArgs,
  pidfilePath,
  primaryRefusal,
  readServePort,
  refusalForRoot,
  renderPidRecord,
  resolveServePort,
  tailLines,
} from '../utils/worktree-serve.ts';

const PORTS_FILE = 'OT_PORT_BASE=7090\n';

const makeCheckout = (rootEnv: string, ports?: string): string => {
  const root = mkdtempSync(join(tmpdir(), 'ot-worktree-serve-'));

  writeFileSync(join(root, '.env'), rootEnv);

  if (ports !== undefined) {
    writeFileSync(join(root, '.worktree-ports'), ports);
  }

  return root;
};

describe('parseServeArgs', () => {
  it('parses a start for each target with the default timeout', () => {
    expect(parseServeArgs(['server'])).toEqual({
      apiOnly: false,
      kind: 'start',
      target: 'server',
      timeoutSeconds: 300,
    });
    expect(parseServeArgs(['developer'])).toMatchObject({ kind: 'start', target: 'developer' }); // prettier-ignore
  });

  it('reads --api-only and --timeout', () => {
    expect(parseServeArgs(['server', '--api-only', '--timeout=45'])).toEqual({
      apiOnly: true,
      kind: 'start',
      target: 'server',
      timeoutSeconds: 45,
    });
  });

  it('parses --stop with and without a target', () => {
    expect(parseServeArgs(['--stop'])).toEqual({ kind: 'stop', target: undefined }); // prettier-ignore
    expect(parseServeArgs(['--stop', 'server'])).toEqual({ kind: 'stop', target: 'server' }); // prettier-ignore
    expect(parseServeArgs(['developer', '--stop'])).toEqual({ kind: 'stop', target: 'developer' }); // prettier-ignore
  });

  it('answers a usage error for anything it does not understand', () => {
    const usage = (args: string[]): string | undefined => {
      const command = parseServeArgs(args);

      return command.kind === 'usage' ? command.message : undefined;
    };

    expect(usage([])).toMatch(/target is required/);
    expect(usage(['admin'])).toMatch(/unknown target "admin"/);
    expect(usage(['server', 'developer'])).toMatch(/unexpected argument developer/); // prettier-ignore
    expect(usage(['server', '--detach'])).toMatch(/unknown flag --detach/);
    expect(usage(['developer', '--api-only'])).toMatch(/server target only/);
    expect(usage(['server', '--timeout=0'])).toMatch(/positive whole number/);
    expect(usage(['server', '--timeout=soon'])).toMatch(/positive whole number/); // prettier-ignore
    expect(usage(['--stop', '--api-only'])).toMatch(/only an optional target/);
  });
});

describe('nx task selection', () => {
  it('runs dev for the server by default, dev-api with --api-only, and the developer dev', () => {
    expect(nxTaskId('server', false)).toBe('openthrottle-server:dev');
    expect(nxTaskId('server', true)).toBe('openthrottle-server:dev-api');
    expect(nxTaskId('developer', false)).toBe('openthrottle-developer:dev');
  });

  it('lists both server tasks for lock sweeps and builds a pnpm nx run argv', () => {
    expect(nxTaskIds('server')).toEqual(['openthrottle-server:dev', 'openthrottle-server:dev-api']); // prettier-ignore
    expect(nxTaskIds('developer')).toEqual(['openthrottle-developer:dev']);
    expect(nxArgv('openthrottle-server:dev')).toEqual({
      args: ['nx', 'run', 'openthrottle-server:dev'],
      command: 'pnpm',
    });
  });
});

describe('state files', () => {
  it('keeps each target log and pidfile under .worktree/logs', () => {
    expect(logPath('/w', 'server')).toBe('/w/.worktree/logs/server.log');
    expect(pidfilePath('/w', 'developer')).toBe('/w/.worktree/logs/developer.pid'); // prettier-ignore
  });

  it('round-trips a pid record and rejects anything incomplete', () => {
    const record = {
      apiOnly: true,
      pid: 4242,
      port: 7091,
      startedAt: '2026-11-01T00:00:00.000Z',
      task: 'openthrottle-server:dev-api',
    };

    expect(parsePidRecord(renderPidRecord(record))).toEqual(record);
    expect(parsePidRecord('')).toBeUndefined();
    expect(parsePidRecord('not json')).toBeUndefined();
    expect(parsePidRecord('null')).toBeUndefined();
    expect(parsePidRecord(JSON.stringify({ ...record, pid: -1 }))).toBeUndefined(); // prettier-ignore
    expect(parsePidRecord(JSON.stringify({ ...record, port: '7091' }))).toBeUndefined(); // prettier-ignore
    expect(parsePidRecord(JSON.stringify({ pid: 1 }))).toBeUndefined();
  });
});

describe('port resolution', () => {
  it('reads the target port from the root env when it is inside the worktree block', () => {
    const env = {
      OPENTHROTTLE_DEVELOPER_PORT: '7090',
      OPENTHROTTLE_SERVER_PORT: '7091',
    };

    expect(resolveServePort('server', env, PORTS_FILE)).toEqual({ kind: 'ok', port: 7091 }); // prettier-ignore
    expect(resolveServePort('developer', env, PORTS_FILE)).toEqual({ kind: 'ok', port: 7090 }); // prettier-ignore
  });

  it('refuses a port outside the pinned block (the primary 6021 must never be killable)', () => {
    const result = resolveServePort('server', { OPENTHROTTLE_SERVER_PORT: '6021' }, PORTS_FILE); // prettier-ignore

    expect(result).toMatchObject({ kind: 'error' });
    expect(result.kind === 'error' && result.message).toMatch(/outside this worktree's port block 7090-7099/); // prettier-ignore
    expect(resolveServePort('server', { OPENTHROTTLE_SERVER_PORT: '7100' }, PORTS_FILE).kind).toBe('error'); // prettier-ignore
  });

  it('errors when the port is unset or the block is unknown', () => {
    expect(resolveServePort('server', {}, PORTS_FILE).kind).toBe('error');
    expect(resolveServePort('server', { OPENTHROTTLE_SERVER_PORT: '' }, PORTS_FILE).kind).toBe('error'); // prettier-ignore
    expect(resolveServePort('server', { OPENTHROTTLE_SERVER_PORT: 'abc' }, PORTS_FILE).kind).toBe('error'); // prettier-ignore
    expect(resolveServePort('server', { OPENTHROTTLE_SERVER_PORT: '7091' }, undefined).kind).toBe('error'); // prettier-ignore
    expect(resolveServePort('server', { OPENTHROTTLE_SERVER_PORT: '7091' }, 'junk').kind).toBe('error'); // prettier-ignore
  });

  it('parses the port base from .worktree-ports contents', () => {
    expect(parsePortBase('OT_PORT_BASE=7090\n')).toBe(7090);
    expect(parsePortBase('nothing')).toBeUndefined();
  });

  it('resolves from the .env and .worktree-ports files of a checkout', () => {
    const root = makeCheckout('OPENTHROTTLE_SERVER_PORT="7091"\n', PORTS_FILE);

    expect(readServePort(root, 'server')).toEqual({ kind: 'ok', port: 7091 });
    expect(readServePort(root, 'developer').kind).toBe('error');
    expect(readServePort(makeCheckout('OPENTHROTTLE_SERVER_PORT=7091\n'), 'server').kind).toBe('error'); // prettier-ignore
  });
});

describe('primary refusal', () => {
  it('refuses the primary mode and allows shared and isolated worktrees', () => {
    expect(primaryRefusal('primary', '/repo')).toMatch(
      /is the primary checkout/,
    );
    expect(primaryRefusal('shared', '/repo')).toBeUndefined();
    expect(primaryRefusal('isolated', '/repo')).toBeUndefined();
  });

  it('decides from the checkout .env marker alone, never the inherited environment', () => {
    const primary = makeCheckout('OPENTHROTTLE_SERVER_PORT=6021\n');
    const shared = makeCheckout('OT_WORKTREE_DB=shared\n');
    const missing = mkdtempSync(join(tmpdir(), 'ot-worktree-serve-empty-'));
    const original = process.env.OT_WORKTREE_DB;

    process.env.OT_WORKTREE_DB = 'shared';

    try {
      expect(refusalForRoot(primary)).toMatch(/primary checkout/);
      expect(refusalForRoot(missing)).toMatch(/primary checkout/);
      expect(refusalForRoot(shared)).toBeUndefined();
    } finally {
      if (original === undefined) {
        delete process.env.OT_WORKTREE_DB;
      } else {
        process.env.OT_WORKTREE_DB = original;
      }
    }
  });
});

describe('buildProbe', () => {
  it('queries listSources with a bearer read from the server .env at run time', () => {
    const probe = buildProbe('/w', 'server', 7091, true);

    expect(probe).toContain('http://localhost:7091/graphql');
    expect(probe).toContain('listSources');
    expect(probe).toContain("sed -n 's/^OPENTHROTTLE_MCP_AUTH_TOKEN=//p' '/w/applications/openthrottle-server/.env'"); // prettier-ignore
    expect(probe).not.toMatch(/ot_sa_/);
  });

  it('falls back to an unauthenticated __typename query without a token', () => {
    const probe = buildProbe('/w', 'server', 7091, false);

    expect(probe).toContain('__typename');
    expect(probe).not.toContain('Authorization');
  });

  it('probes the developer app by HTTP status', () => {
    expect(buildProbe('/w', 'developer', 7090, true)).toBe(
      "curl -sS -o /dev/null -w '%{http_code}\\n' http://localhost:7090/",
    );
  });
});

describe('nx lock log parsing', () => {
  it('collects each distinct task Nx says another process runs', () => {
    const log = [
      'Waiting for @openthrottle/nestjs-utils:dev in another nx process',
      'noise',
      'Waiting for openthrottle-server:dev in another nx process',
      'Waiting for openthrottle-server:dev in another nx process',
    ].join('\n');

    expect(nxLockWaits(log)).toEqual(['@openthrottle/nestjs-utils:dev', 'openthrottle-server:dev']); // prettier-ignore
    expect(nxLockWaits('all quiet')).toEqual([]);
  });

  it('scopes a log to the latest launch so earlier runs are not mistaken for this one', () => {
    const first = launchHeader('server', 'pnpm nx run openthrottle-server:dev', new Date(0)); // prettier-ignore
    const second = launchHeader('server', 'pnpm nx run openthrottle-server:dev', new Date(1000)); // prettier-ignore
    const log = `${first}Waiting for openthrottle-server:dev in another nx process\n${second}fresh output\n`; // prettier-ignore

    expect(nxLockWaits(log)).toEqual(['openthrottle-server:dev']);
    expect(nxLockWaits(currentLaunchLog(log))).toEqual([]);
    expect(currentLaunchLog('no header')).toBe('no header');
  });
});

describe('process and output parsing', () => {
  it('takes the tail of a log without trailing blank lines', () => {
    expect(tailLines('a\nb\nc\n\n', 2)).toBe('b\nc');
    expect(tailLines('', 5)).toBe('');
  });

  it('parses lsof -ti output into pids', () => {
    expect(parsePids('123\n456\n\nx\n')).toEqual([123, 456]);
    expect(parsePids('')).toEqual([]);
  });

  it('parses lsof -Fn cwd output', () => {
    expect(parseLsofCwd('p123\nfcwd\nn/Users/me/w\n')).toBe('/Users/me/w');
    expect(parseLsofCwd('')).toBeUndefined();
  });

  it('parses the ps table and walks a process subtree', () => {
    const table = parseProcessTable(
      [
        '  10     1    10 pnpm nx run server:dev',
        '  11    10    11 node nx.js',
        '  12    11    12 node tsc --watch',
        '  13     1    13 unrelated process',
        'garbage line',
      ].join('\n'),
    );

    expect(table).toHaveLength(4);
    expect(table[1]).toEqual({ command: 'node nx.js', pgid: 11, pid: 11, ppid: 10 }); // prettier-ignore
    expect(descendantPids(table, 10).sort()).toEqual([10, 11, 12]);
    expect(descendantPids(table, 13)).toEqual([13]);
  });

  it('decides whether a path is inside the worktree without prefix confusion', () => {
    expect(isInsideWorktree('/w/monorepo/wt', '/w/monorepo/wt')).toBe(true);
    expect(isInsideWorktree('/w/monorepo/wt/applications/x', '/w/monorepo/wt')).toBe(true); // prettier-ignore
    expect(isInsideWorktree('/w/monorepo/wt-2', '/w/monorepo/wt')).toBe(false);
    expect(isInsideWorktree('/w/monorepo', '/w/monorepo/wt')).toBe(false);
  });
});
