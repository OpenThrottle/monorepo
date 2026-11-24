import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getDriver, runDriverAsync } from '@openthrottle/openthrottle-drivers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TaskFragment } from '../../__generated__/graphql.ts';
import {
  buildFinalValidationDescription,
  buildPlanRunWorkerGraphqlOptions,
  buildSessionOptions,
  buildWorkerEnv,
  formatNarration,
  resolvePlanRunWorkerGraphqlConfigFromEnv,
  toLoopTask,
  toTimeoutMs,
} from './ot-loop.utils.ts';

/** Secret-shaped names the server env holds that no agent child may receive. */
const SENTINEL_NAMES = new Set<string>([
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'ELEVENLABS_API_KEY',
  'FISH_AUDIO_API_KEY',
  'GEMINI_API_KEY',
  'GH_TOKEN',
  'GITHUB_TOKEN',
  'HCLOUD_TOKEN',
  'OPENAI_API_KEY',
  'OPENTHROTTLE_DEVELOPER_JWT_SECRET',
  'OT_CANARY_SECRET',
  'POSTGRES_PASSWORD',
  'ROLLBAR_TOKEN',
]);

const row = (overrides: Partial<TaskFragment> = {}): TaskFragment => {
  return {
    category: 'implementation',
    createdAt: '2026-11-09T00:00:00.000Z',
    description: 'Do the thing',
    id: 'task-1',
    planId: 'plan-1',
    requirementsJson: JSON.stringify(['it works', '  ']),
    sortOrder: 1000,
    status: 'PENDING',
    title: 'Thing',
    updatedAt: '2026-11-09T00:00:00.000Z',
    ...overrides,
  };
};

describe('toLoopTask', () => {
  it('maps a pending row, parsing the acceptance criteria', () => {
    expect(toLoopTask(row())).toEqual({
      category: 'implementation',
      createdAt: '2026-11-09T00:00:00.000Z',
      description: 'Do the thing',
      id: 'task-1',
      requirements: ['it works'],
      sortOrder: 1000,
      status: 'PENDING',
      title: 'Thing',
    });
  });

  it('keeps every status the loop knows', () => {
    for (const status of [
      'BLOCKED',
      'COMPLETED',
      'IN_PROGRESS',
      'PENDING',
      'QUEUED',
      'SKIPPED',
    ]) {
      expect(toLoopTask(row({ status })).status).toBe(status);
    }
  });

  it('maps a status the loop has no case for to SKIPPED, so it neither runs nor blocks the close', () => {
    expect(toLoopTask(row({ status: 'CANCELED' })).status).toBe('SKIPPED');
    expect(toLoopTask(row({ status: 'PROMOTED' })).status).toBe('SKIPPED');
  });

  it('maps a runner-executed hook task to SKIPPED so the loop never double-runs it', () => {
    const hook = row({
      hookRole: 'beforeAll',
      hookSource: 'skill',
      parentTaskId: null,
    });

    expect(toLoopTask(hook).status).toBe('SKIPPED');
  });

  it('treats a task-level hook (it has a parent) as an ordinary task', () => {
    const hook = row({
      hookRole: 'beforeEach',
      hookSource: 'skill',
      parentTaskId: 'parent-1',
    });

    expect(toLoopTask(hook).status).toBe('PENDING');
  });

  it('defaults a missing description and category', () => {
    const task = toLoopTask(row({ category: null, description: null }));

    expect(task.category).toBeNull();
    expect(task.description).toBe('');
  });
});

describe('buildWorkerEnv', () => {
  it('blanks every OT credential variable the MCP authenticates with', () => {
    expect(buildWorkerEnv()).toEqual({
      OPENTHROTTLE_MCP_AUTH_TOKEN: '',
      OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN: '',
      OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN: '',
      OT_MCP_AUTH_TOKEN_ENV_FILE: '',
    });
  });

  // Canary for the OT Loop spawn path: a real stub agent CLI, no child_process mock, records every
  // variable it received. A sibling covers the scheduled path (openthrottle-drivers).
  describe('when a real agent CLI is spawned with it', () => {
    let dir: string;
    let namesFile: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'child-env-canary-'));
      namesFile = join(dir, 'env.txt');
      const stub = join(dir, 'claude-stub');
      writeFileSync(stub, `#!/bin/sh\n/usr/bin/env | sort > '${namesFile}'\n`);
      chmodSync(stub, 0o755);
      vi.stubEnv('OPENTHROTTLE_CLAUDE_BIN', stub);
      vi.stubEnv('OPENTHROTTLE_MCP_AUTH_TOKEN', 'real-token');
      vi.stubEnv(
        'OPENTHROTTLE_AGENT_ENV_PASSTHROUGH',
        'OPENTHROTTLE_MCP_AUTH_TOKEN',
      );
      for (const name of SENTINEL_NAMES) {
        vi.stubEnv(name, 'sentinel-secret-value');
      }
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      rmSync(dir, { force: true, recursive: true });
    });

    it('delivers no server secret, and only blank OT tokens', async () => {
      await runDriverAsync(getDriver('claude'), {
        env: buildWorkerEnv(),
        iteration: 1,
        prompt: 'canary',
      });

      const lines = readFileSync(namesFile, 'utf8').split('\n');
      const received = lines.map((line) => line.split('=')[0] ?? '');
      expect(received).toContain('PATH');
      expect(received.filter((name) => SENTINEL_NAMES.has(name))).toEqual([]);
      expect(lines).toContain('OPENTHROTTLE_MCP_AUTH_TOKEN=');
    });
  });
});

describe('buildSessionOptions', () => {
  it('carries the run session in X-OT-Session-Id', () => {
    expect(buildSessionOptions('session-1')).toEqual({
      headers: { 'X-OT-Session-Id': 'session-1' },
    });
  });

  it.each([null, undefined, ''])('is undefined for %j', (value) => {
    expect(buildSessionOptions(value)).toBeUndefined();
  });
});

describe('toTimeoutMs', () => {
  it('converts seconds to milliseconds', () => {
    expect(toTimeoutMs(90)).toBe(90_000);
  });

  it.each([null, undefined])('is undefined for %j', (value) => {
    expect(toTimeoutMs(value)).toBeUndefined();
  });
});

describe('formatNarration', () => {
  it('prefixes one trimmed line', () => {
    expect(formatNarration('[ot-loop]', 'hello  \n')).toBe('[ot-loop] hello\n');
  });
});

describe('buildFinalValidationDescription', () => {
  it('names the command, its exit code and the tail', () => {
    const text = buildFinalValidationDescription({
      command: 'pnpm test',
      exitCode: 2,
      tail: 'boom',
    });

    expect(text).toContain('Command: pnpm test');
    expect(text).toContain('Exit code: 2');
    expect(text).toContain('boom');
  });
});

describe('resolvePlanRunWorkerGraphqlConfigFromEnv (auth token)', () => {
  const snapshot = { ...process.env };

  const clearAuthTokenEnv = (): void => {
    delete process.env.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN;
    delete process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN;
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('prefers OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', () => {
    clearAuthTokenEnv();
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN = 'worker-token';
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN = 'wf-token';
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'mcp-token';

    expect(resolvePlanRunWorkerGraphqlConfigFromEnv().token).toBe(
      'worker-token',
    );
  });

  it('falls back to OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN', () => {
    clearAuthTokenEnv();
    process.env.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN = 'wf-token';
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'mcp-token';

    expect(resolvePlanRunWorkerGraphqlConfigFromEnv().token).toBe('wf-token');
  });

  it('falls back to OPENTHROTTLE_MCP_AUTH_TOKEN', () => {
    clearAuthTokenEnv();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = 'mcp-token';

    expect(resolvePlanRunWorkerGraphqlConfigFromEnv().token).toBe('mcp-token');
  });

  it('returns undefined when no auth token env vars are set', () => {
    clearAuthTokenEnv();

    expect(resolvePlanRunWorkerGraphqlConfigFromEnv().token).toBeUndefined();
  });
});

describe('resolvePlanRunWorkerGraphqlConfigFromEnv (graphql url)', () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('prefers OPENTHROTTLE_WORKER_GRAPHQL_URL', () => {
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL = 'http://worker/graphql';
    process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL = 'http://wf/graphql';

    expect(resolvePlanRunWorkerGraphqlConfigFromEnv().graphqlUrl).toBe(
      'http://worker/graphql',
    );
  });

  it('falls back to OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL', () => {
    delete process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL;
    process.env.OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL = 'http://wf/graphql';

    expect(resolvePlanRunWorkerGraphqlConfigFromEnv().graphqlUrl).toBe(
      'http://wf/graphql',
    );
  });
});

describe('resolvePlanRunWorkerGraphqlConfigFromEnv', () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it('combines token and url overrides', () => {
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN = 't';
    process.env.OPENTHROTTLE_WORKER_GRAPHQL_URL = 'http://localhost/g';

    expect(resolvePlanRunWorkerGraphqlConfigFromEnv()).toEqual({
      graphqlUrl: 'http://localhost/g',
      token: 't',
    });
  });
});

describe('buildPlanRunWorkerGraphqlOptions', () => {
  it('uses the configured url and a trimmed token', () => {
    expect(
      buildPlanRunWorkerGraphqlOptions({
        graphqlUrl: ' http://localhost/g ',
        token: ' t ',
      }),
    ).toEqual({ token: 't', url: 'http://localhost/g' });
  });

  it('omits a blank token', () => {
    expect(
      buildPlanRunWorkerGraphqlOptions({
        graphqlUrl: 'http://localhost/g',
        token: '  ',
      }),
    ).toEqual({ url: 'http://localhost/g' });
  });
});
