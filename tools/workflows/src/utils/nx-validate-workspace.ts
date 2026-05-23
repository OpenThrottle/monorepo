import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * @description Resolves the monorepo root (pnpm workspace) from cwd or WORKSPACE_ROOT.
 */
export const resolveWorkspaceRoot = (startDir: string): string => {
  const fromEnv = process.env.WORKSPACE_ROOT?.trim();
  if (fromEnv) {
    const marker = path.join(fromEnv, 'pnpm-workspace.yaml');
    if (fs.existsSync(marker)) {
      return fromEnv;
    }
  }

  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        'Could not find monorepo root (pnpm-workspace.yaml). Run from the workspace or set WORKSPACE_ROOT.',
      );
    }
    dir = parent;
  }
};

/**
 * @description Runs root package.json nx:validate (tags, projects, configurations).
 */
export const runNxValidateScripts = (workspaceRoot: string): number => {
  const result = spawnSync('pnpm', ['run', 'nx:validate'], {
    cwd: workspaceRoot,
    shell: true,
    stdio: 'inherit',
  });
  return result.status ?? 1;
};
