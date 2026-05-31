import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  OPENTHROTTLE_POSTGRES_URL_ENV,
  buildWorkflowRalphSpawnEnv,
  resolveCortexPostgresConnectionStringFromEnv,
  resolveOpenThrottleRoot,
  WORKFLOW_RALPH_OT_ROOT_ENV,
  WORKFLOW_RALPH_SPAWN_HOME_ENV,
  WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV,
} from '../../../../../packages/ai-mcp/src/config';

/** Temp dir without a node_modules/.bin so OT bin resolution is a no-op. */
let emptyRoot: string;
/** Temp dir with node_modules/.bin to simulate the OpenThrottle monorepo root. */
let otRoot: string;
let otBinDir: string;

beforeAll(() => {
  emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-empty-'));
  otRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-root-'));
  otBinDir = path.join(otRoot, 'node_modules', '.bin');
  fs.mkdirSync(otBinDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(emptyRoot, { force: true, recursive: true });
  fs.rmSync(otRoot, { force: true, recursive: true });
});

describe('resolveCortexPostgresConnectionStringFromEnv', () => {
  it('prefers OPENTHROTTLE_CORTEX_POSTGRES_URL over POSTGRES_URL', () => {
    const conn = resolveCortexPostgresConnectionStringFromEnv({
      [OPENTHROTTLE_POSTGRES_URL_ENV]:
        'postgresql://cortex@db.example:5432/openthrottle',
      POSTGRES_URL: 'postgresql://foreign@localhost:5432/wrong_db',
    });

    expect(conn).toBe('postgresql://cortex@db.example:5432/openthrottle');
  });
});

describe('resolveOpenThrottleRoot', () => {
  it('honors an explicit WORKFLOW_RALPH_OT_ROOT when the directory exists', () => {
    expect(
      resolveOpenThrottleRoot({ [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot }),
    ).toBe(otRoot);
  });

  it('falls through past a missing explicit root to the module walk-up', () => {
    const resolved = resolveOpenThrottleRoot({
      [WORKFLOW_RALPH_OT_ROOT_ENV]: path.join(otRoot, 'does-not-exist'),
    });

    // Module walk-up lands in the OpenThrottle monorepo (has pnpm-workspace.yaml).
    expect(resolved).toBeDefined();
    expect(
      fs.existsSync(path.join(resolved as string, 'pnpm-workspace.yaml')),
    ).toBe(true);
  });
});

describe('buildWorkflowRalphSpawnEnv', () => {
  it('sets graphql transport by default and forwards worker GraphQL auth', () => {
    const env: NodeJS.ProcessEnv = {
      FOO: 'bar',
      MCP_DEVELOPER_AUTH_TOKEN: 'dev-token',
      [WORKFLOW_RALPH_OT_ROOT_ENV]: emptyRoot,
    };
    const out = buildWorkflowRalphSpawnEnv(env);

    expect(out).not.toBe(env);
    expect(out.WORKFLOW_RALPH_TRANSPORT).toBe('graphql');
    expect(out.OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN).toBe('dev-token');
    expect(out.FOO).toBe('bar');
  });

  it('prepends the OT bin dir to PATH for deterministic workflow-ralph resolution', () => {
    const out = buildWorkflowRalphSpawnEnv({
      PATH: '/usr/bin',
      [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot,
    });

    expect(out.PATH).toBe(`${otBinDir}${path.delimiter}/usr/bin`);
  });

  it('injects WORKFLOW_RALPH_OT_ROOT so nested Ralph resolves foreign cwd vs monorepo root', () => {
    const out = buildWorkflowRalphSpawnEnv({
      PATH: '/usr/bin',
      [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot,
    });

    expect(out[WORKFLOW_RALPH_OT_ROOT_ENV]).toBe(otRoot);
  });

  it('sets HOME from WORKFLOW_RALPH_SPAWN_HOME when set', () => {
    const out = buildWorkflowRalphSpawnEnv({
      HOME: '/worker',
      [WORKFLOW_RALPH_SPAWN_HOME_ENV]: '/mounted',
    });

    expect(out.HOME).toBe('/mounted');
    expect(out).not.toBe(process.env);
  });

  it('merges canonical postgres URL with HOME and XDG overrides when transport is postgres-direct', () => {
    const out = buildWorkflowRalphSpawnEnv(
      {
        HOME: '/w',
        POSTGRES_URL: 'postgresql://a:b@localhost:1/db',
        [WORKFLOW_RALPH_SPAWN_HOME_ENV]: '/vault',
        [WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME_ENV]: '/xdg',
        WORKFLOW_RALPH_TRANSPORT: 'postgres-direct',
      },
      { canonicalCortexPostgresUrl: 'postgresql://c:d@localhost:2/db2' },
    );

    expect(out.HOME).toBe('/vault');
    expect(out.XDG_CONFIG_HOME).toBe('/xdg');
    expect(out.WORKFLOW_RALPH_TRANSPORT).toBe('postgres-direct');
    expect(out.POSTGRES_URL).toBe('postgresql://c:d@localhost:2/db2');
    expect(out[OPENTHROTTLE_POSTGRES_URL_ENV]).toBe(
      'postgresql://c:d@localhost:2/db2',
    );
  });

  it('does not override HOME when WORKFLOW_RALPH_SPAWN_HOME is blank after trim', () => {
    const env: NodeJS.ProcessEnv = {
      HOME: '/keep',
      [WORKFLOW_RALPH_OT_ROOT_ENV]: emptyRoot,
      [WORKFLOW_RALPH_SPAWN_HOME_ENV]: '   ',
    };

    const out = buildWorkflowRalphSpawnEnv(env);

    expect(out.HOME).toBe('/keep');
    expect(out.WORKFLOW_RALPH_TRANSPORT).toBe('graphql');
  });

  it('applies spawn.home from mergedDefaults when env omits WORKFLOW_RALPH_SPAWN_HOME', () => {
    const out = buildWorkflowRalphSpawnEnv(
      {
        HOME: '/worker',
        PATH: '/usr/bin',
        [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot,
      },
      { mergedDefaults: { spawn: { home: '/mounted' } } },
    );

    expect(out.HOME).toBe('/mounted');
  });

  it('applies spawn.otRoot from mergedDefaults when env omits WORKFLOW_RALPH_OT_ROOT', () => {
    const out = buildWorkflowRalphSpawnEnv(
      { PATH: '/usr/bin' },
      { mergedDefaults: { spawn: { otRoot } } },
    );

    expect(out[WORKFLOW_RALPH_OT_ROOT_ENV]).toBe(otRoot);
    expect(out.PATH).toBe(`${otBinDir}${path.delimiter}/usr/bin`);
  });

  it('applies transport from mergedDefaults when env omits WORKFLOW_RALPH_TRANSPORT', () => {
    const out = buildWorkflowRalphSpawnEnv(
      { [WORKFLOW_RALPH_OT_ROOT_ENV]: emptyRoot },
      { mergedDefaults: { transport: 'postgres-direct' } },
    );

    expect(out.WORKFLOW_RALPH_TRANSPORT).toBe('postgres-direct');
  });
});
