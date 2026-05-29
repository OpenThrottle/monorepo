import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setWorkspaceRoot, workspaceRoot } from 'nx/src/utils/workspace-root';

import {
  NX_WORKSPACE_ROOT_PATH_ENV,
  pinNxWorkspaceRootToOpenThrottle,
} from '../projects';
import { WORKFLOW_RALPH_OT_ROOT_ENV } from '../../../../../packages/ai-mcp/src/config';

/** Temp dir with pnpm-workspace.yaml to simulate the OpenThrottle monorepo root. */
let otRoot: string;

/** The cached Nx workspace root before any test pins it. */
const initialWorkspaceRoot = workspaceRoot;

beforeAll(() => {
  otRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-pin-root-'));
  fs.writeFileSync(path.join(otRoot, 'pnpm-workspace.yaml'), 'packages: []\n');
});

afterAll(() => {
  fs.rmSync(otRoot, { force: true, recursive: true });
});

afterEach(() => {
  // Defensive: never leak a pinned cached root to later suites if a test throws.
  setWorkspaceRoot(initialWorkspaceRoot);
});

describe('pinNxWorkspaceRootToOpenThrottle', () => {
  it('pins NX_WORKSPACE_ROOT_PATH, disables the daemon, and updates the cached workspace root', () => {
    const env: NodeJS.ProcessEnv = {
      [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot,
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
      [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot,
    };

    const { restore } = pinNxWorkspaceRootToOpenThrottle(env);
    restore();

    expect(env[NX_WORKSPACE_ROOT_PATH_ENV]).toBe('/previous/root');
    expect(env.NX_DAEMON).toBe('true');
    expect(workspaceRoot).toBe(initialWorkspaceRoot);
  });

  it('restore() deletes env vars that were unset before pinning', () => {
    const env: NodeJS.ProcessEnv = {
      [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot,
    };

    const { restore } = pinNxWorkspaceRootToOpenThrottle(env);
    restore();

    expect(NX_WORKSPACE_ROOT_PATH_ENV in env).toBe(false);
    expect('NX_DAEMON' in env).toBe(false);
  });
});
