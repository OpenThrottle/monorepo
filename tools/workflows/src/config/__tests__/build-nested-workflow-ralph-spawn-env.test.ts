import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  WORKFLOW_RALPH_OT_ROOT_ENV,
  WORKFLOW_RALPH_SPAWN_HOME_ENV,
} from '../../../../../packages/ai-mcp/src/config';
import {
  applyWorkflowRalphOtRootFromConfig,
  buildNestedWorkflowRalphSpawnEnv,
  resolveWorkflowRalphConfigCwd,
} from '../build-nested-workflow-ralph-spawn-env';
import { WORKFLOW_RALPH_DEFAULTS_FILENAME } from '../workflow-ralph-defaults.types';

describe('resolveWorkflowRalphConfigCwd', () => {
  it('prefers workingDirectory over WORKSPACE_ROOT and process cwd', () => {
    expect(
      resolveWorkflowRalphConfigCwd('/job/wt', {
        WORKSPACE_ROOT: '/server/root',
      }),
    ).toBe('/job/wt');
  });

  it('falls back to WORKSPACE_ROOT when workingDirectory is blank', () => {
    expect(
      resolveWorkflowRalphConfigCwd('  ', { WORKSPACE_ROOT: '/server/root' }),
    ).toBe('/server/root');
  });
});

describe('buildNestedWorkflowRalphSpawnEnv', () => {
  let dir: string;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { force: true, recursive: true });
    }
    vi.unstubAllEnvs();
  });

  it('applies spawn.home from .workflow-ralph.json when env omits WORKFLOW_RALPH_SPAWN_HOME', () => {
    dir = mkdtempSync(join(tmpdir(), 'wr-nested-spawn-'));
    writeFileSync(
      join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
      JSON.stringify({ spawn: { home: '/from-file' } }),
      'utf8',
    );

    const out = buildNestedWorkflowRalphSpawnEnv(dir, {
      HOME: '/worker',
      PATH: '/usr/bin',
    });

    expect(out.HOME).toBe('/from-file');
    expect(out[WORKFLOW_RALPH_SPAWN_HOME_ENV]).toBeUndefined();
  });

  it('env spawn.home overrides file spawn.home', () => {
    dir = mkdtempSync(join(tmpdir(), 'wr-nested-spawn-env-'));
    writeFileSync(
      join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
      JSON.stringify({ spawn: { home: '/from-file' } }),
      'utf8',
    );

    const out = buildNestedWorkflowRalphSpawnEnv(dir, {
      HOME: '/worker',
      PATH: '/usr/bin',
      [WORKFLOW_RALPH_SPAWN_HOME_ENV]: '/from-env',
    });

    expect(out.HOME).toBe('/from-env');
  });
});

describe('applyWorkflowRalphOtRootFromConfig', () => {
  let dir: string;
  const originalOtRoot = process.env[WORKFLOW_RALPH_OT_ROOT_ENV];

  afterEach(() => {
    if (dir) {
      rmSync(dir, { force: true, recursive: true });
    }
    if (originalOtRoot === undefined) {
      delete process.env[WORKFLOW_RALPH_OT_ROOT_ENV];
    } else {
      process.env[WORKFLOW_RALPH_OT_ROOT_ENV] = originalOtRoot;
    }
  });

  it('sets WORKFLOW_RALPH_OT_ROOT from spawn.otRoot in file when env unset', () => {
    dir = mkdtempSync(join(tmpdir(), 'wr-ot-root-file-'));
    delete process.env[WORKFLOW_RALPH_OT_ROOT_ENV];
    writeFileSync(
      join(dir, WORKFLOW_RALPH_DEFAULTS_FILENAME),
      JSON.stringify({ spawn: { otRoot: dir } }),
      'utf8',
    );

    applyWorkflowRalphOtRootFromConfig(dir, process.env);

    expect(process.env[WORKFLOW_RALPH_OT_ROOT_ENV]).toBe(dir);
  });
});
