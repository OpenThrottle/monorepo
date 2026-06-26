import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setWorkspaceRoot, workspaceRoot } from 'nx/src/utils/workspace-root';

import {
  NX_WORKSPACE_ROOT_PATH_ENV,
  pinNxWorkspaceRootToOpenThrottle,
  prependOpenThrottleBinToPath,
  resolveOpenThrottleBinDir,
} from '../nodejs.ts';

/** Temp dir without a node_modules/.bin so OT bin resolution is a no-op. */
let emptyRoot: string;
/** Temp dir with node_modules/.bin to simulate the OpenThrottle monorepo root. */
let otRoot: string;
let otBinDir: string;

/** The cached Nx workspace root before any test pins it. */
const initialWorkspaceRoot = workspaceRoot;

beforeAll(() => {
  emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-empty-'));
  otRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-pin-root-'));
  fs.writeFileSync(path.join(otRoot, 'pnpm-workspace.yaml'), 'packages: []\n');
  otBinDir = path.join(otRoot, 'node_modules', '.bin');
  fs.mkdirSync(otBinDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(emptyRoot, { force: true, recursive: true });
  fs.rmSync(otRoot, { force: true, recursive: true });
});

afterEach(() => {
  setWorkspaceRoot(initialWorkspaceRoot);
});

describe('resolveOpenThrottleBinDir', () => {
  it('returns the OT node_modules/.bin when it exists', () => {
    expect(resolveOpenThrottleBinDir({ WORKFLOW_RALPH_OT_ROOT: otRoot })).toBe(
      otBinDir,
    );
  });

  it('returns undefined when the resolved root has no node_modules/.bin', () => {
    expect(
      resolveOpenThrottleBinDir({ WORKFLOW_RALPH_OT_ROOT: emptyRoot }),
    ).toBeUndefined();
  });
});

describe('prependOpenThrottleBinToPath', () => {
  it('prepends the OT bin dir to PATH', () => {
    const out = prependOpenThrottleBinToPath({
      PATH: '/usr/bin',
      WORKFLOW_RALPH_OT_ROOT: otRoot,
    });

    expect(out.PATH).toBe(`${otBinDir}${path.delimiter}/usr/bin`);
  });

  it('is idempotent when the OT bin dir is already on PATH', () => {
    const env: NodeJS.ProcessEnv = {
      PATH: `${otBinDir}${path.delimiter}/usr/bin`,
      WORKFLOW_RALPH_OT_ROOT: otRoot,
    };

    expect(prependOpenThrottleBinToPath(env)).toBe(env);
  });

  it('leaves env untouched when the bin dir cannot be resolved', () => {
    const env: NodeJS.ProcessEnv = {
      PATH: '/usr/bin',
      WORKFLOW_RALPH_OT_ROOT: emptyRoot,
    };

    expect(prependOpenThrottleBinToPath(env)).toBe(env);
  });
});

describe('pinNxWorkspaceRootToOpenThrottle', () => {
  it('pins NX_WORKSPACE_ROOT_PATH, disables the daemon, and updates the cached workspace root', () => {
    const env: NodeJS.ProcessEnv = {
      WORKFLOW_RALPH_OT_ROOT: otRoot,
    };

    const { restore, workspaceRoot: resolved } =
      pinNxWorkspaceRootToOpenThrottle(env);

    expect(resolved).toBe(otRoot);
    expect(env[NX_WORKSPACE_ROOT_PATH_ENV]).toBe(otRoot);
    expect(env.NX_DAEMON).toBe('false');
    expect(workspaceRoot).toBe(otRoot);

    restore();
  });

  it('restore() reverts env vars and the cached workspace root to prior values', () => {
    const env: NodeJS.ProcessEnv = {
      NX_DAEMON: 'true',
      [NX_WORKSPACE_ROOT_PATH_ENV]: '/previous/root',
      WORKFLOW_RALPH_OT_ROOT: otRoot,
    };

    const { restore } = pinNxWorkspaceRootToOpenThrottle(env);
    restore();

    expect(env[NX_WORKSPACE_ROOT_PATH_ENV]).toBe('/previous/root');
    expect(env.NX_DAEMON).toBe('true');
    expect(workspaceRoot).toBe(initialWorkspaceRoot);
  });

  it('restore() deletes env vars that were unset before pinning', () => {
    const env: NodeJS.ProcessEnv = {
      WORKFLOW_RALPH_OT_ROOT: otRoot,
    };

    const { restore } = pinNxWorkspaceRootToOpenThrottle(env);
    restore();

    expect(NX_WORKSPACE_ROOT_PATH_ENV in env).toBe(false);
    expect('NX_DAEMON' in env).toBe(false);
  });
});
