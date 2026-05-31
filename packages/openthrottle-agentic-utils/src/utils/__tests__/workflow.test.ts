import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  getOpenThrottleRoot,
  getWorkflowConfigCwd,
  readWorkflowDebugLevelFromEnv,
  WORKFLOW_RALPH_DEBUG_ENV,
  WORKFLOW_RALPH_DEBUG_LEGACY_ENV,
  WORKFLOW_RALPH_OT_ROOT_ENV,
  WORKFLOW_RALPH_VERBOSE_ENV,
} from '../workflow.js';

/** Temp dir without a workspace marker. */
let emptyRoot: string;
/** Temp dir with pnpm-workspace.yaml to simulate the OpenThrottle monorepo root. */
let otRoot: string;

beforeAll(() => {
  emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-empty-'));
  otRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-root-'));
  fs.writeFileSync(
    path.join(otRoot, 'pnpm-workspace.yaml'),
    'packages:\n  - packages/*\n',
  );
});

afterAll(() => {
  fs.rmSync(emptyRoot, { force: true, recursive: true });
  fs.rmSync(otRoot, { force: true, recursive: true });
});

describe('getOpenThrottleRoot', () => {
  it('honors an explicit WORKFLOW_RALPH_OT_ROOT when the directory exists', () => {
    expect(getOpenThrottleRoot({ [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot })).toBe(
      otRoot,
    );
  });

  it('falls through past a missing explicit root to the module walk-up', () => {
    const resolved = getOpenThrottleRoot({
      [WORKFLOW_RALPH_OT_ROOT_ENV]: path.join(otRoot, 'does-not-exist'),
    });

    expect(resolved).toBeDefined();
    expect(
      fs.existsSync(path.join(resolved as string, 'pnpm-workspace.yaml')),
    ).toBe(true);
  });

  it('prefers WORKSPACE_ROOT when it contains pnpm-workspace.yaml', () => {
    expect(getOpenThrottleRoot({ WORKSPACE_ROOT: otRoot })).toBe(otRoot);
  });

  it('ignores WORKSPACE_ROOT without the workspace marker', () => {
    const resolved = getOpenThrottleRoot({
      [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot,
      WORKSPACE_ROOT: emptyRoot,
    });

    expect(resolved).toBe(otRoot);
  });

  it('falls back to module walk-up when env overrides are unset', () => {
    const resolved = getOpenThrottleRoot({});

    expect(resolved).toBeDefined();
    expect(
      fs.existsSync(path.join(resolved as string, 'pnpm-workspace.yaml')),
    ).toBe(true);
  });
});

describe('getWorkflowConfigCwd', () => {
  it('prefers workingDirectory over WORKSPACE_ROOT and process cwd', () => {
    expect(
      getWorkflowConfigCwd('/job/wt', { WORKSPACE_ROOT: '/server/root' }),
    ).toBe('/job/wt');
  });

  it('falls back to WORKSPACE_ROOT when workingDirectory is blank', () => {
    expect(getWorkflowConfigCwd('  ', { WORKSPACE_ROOT: '/server/root' })).toBe(
      '/server/root',
    );
  });

  it('falls back to process.cwd when workingDirectory and WORKSPACE_ROOT are unset', () => {
    expect(getWorkflowConfigCwd(undefined, {})).toBe(process.cwd());
  });
});

describe('readWorkflowDebugLevelFromEnv', () => {
  it('returns off when unset and legacy unset', () => {
    expect(
      readWorkflowDebugLevelFromEnv({
        [WORKFLOW_RALPH_DEBUG_ENV]: undefined,
        [WORKFLOW_RALPH_DEBUG_LEGACY_ENV]: undefined,
        [WORKFLOW_RALPH_VERBOSE_ENV]: undefined,
      }),
    ).toBe('off');
  });

  it('maps truthy WORKFLOW_RALPH_DEBUG to debug', () => {
    expect(
      readWorkflowDebugLevelFromEnv({ [WORKFLOW_RALPH_DEBUG_ENV]: '1' }),
    ).toBe('debug');
    expect(
      readWorkflowDebugLevelFromEnv({ [WORKFLOW_RALPH_DEBUG_ENV]: 'true' }),
    ).toBe('debug');
  });

  it('maps RALPH_DEBUG legacy when primary unset', () => {
    expect(
      readWorkflowDebugLevelFromEnv({
        [WORKFLOW_RALPH_DEBUG_ENV]: undefined,
        [WORKFLOW_RALPH_DEBUG_LEGACY_ENV]: 'yes',
      }),
    ).toBe('debug');
  });

  it('maps verbose level from WORKFLOW_RALPH_DEBUG', () => {
    expect(
      readWorkflowDebugLevelFromEnv({
        [WORKFLOW_RALPH_DEBUG_ENV]: 'verbose',
      }),
    ).toBe('verbose');
    expect(
      readWorkflowDebugLevelFromEnv({ [WORKFLOW_RALPH_DEBUG_ENV]: '2' }),
    ).toBe('verbose');
  });

  it('maps WORKFLOW_RALPH_VERBOSE to verbose', () => {
    expect(
      readWorkflowDebugLevelFromEnv({ [WORKFLOW_RALPH_VERBOSE_ENV]: '1' }),
    ).toBe('verbose');
  });

  it('returns off for explicit falsy strings', () => {
    expect(
      readWorkflowDebugLevelFromEnv({ [WORKFLOW_RALPH_DEBUG_ENV]: '0' }),
    ).toBe('off');
    expect(
      readWorkflowDebugLevelFromEnv({ [WORKFLOW_RALPH_DEBUG_ENV]: 'false' }),
    ).toBe('off');
  });
});
