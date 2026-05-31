import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  getOpenThrottleRoot,
  getWorkflowConfigCwd,
  WORKFLOW_RALPH_OT_ROOT_ENV,
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
