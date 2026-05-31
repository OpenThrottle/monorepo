import * as fs from 'node:fs';
import * as path from 'node:path';
import { setWorkspaceRoot, workspaceRoot } from 'nx/src/utils/workspace-root';

import { getOpenThrottleRoot } from './workflow.js';

/** Nx env var that overrides workspace-root detection (read before the cwd walk-up). */
export const NX_WORKSPACE_ROOT_PATH_ENV = `NX_WORKSPACE_ROOT_PATH`;

/** Result of {@link pinNxWorkspaceRootToOpenThrottle}. */
export interface PinNxWorkspaceRootResult {
  /** Restores the env + cached workspace root to their pre-pin values. */
  readonly restore: () => void;
  /** The resolved OpenThrottle root, or undefined when it could not be located. */
  readonly workspaceRoot: string | undefined;
}

/**
 * @description Pins Nx project-graph resolution to the OpenThrottle monorepo root so `--project`
 * validation uses the OpenThrottle graph regardless of a foreign `cwd` (a `workingDirectory` outside
 * this monorepo). Without this, Nx resolves the graph from `process.cwd()` and yields the target repo's
 * graph (or none), breaking validation and polluting logs with bare/incomplete nx invocations.
 *
 * It sets {@link NX_WORKSPACE_ROOT_PATH_ENV}, disables the Nx daemon (so the graph is built in-process
 * against the pinned root instead of a foreign-cwd daemon), and updates Nx's cached `workspaceRoot`.
 * The returned `restore()` reverts all three. The OpenThrottle root is resolved via
 * {@link getOpenThrottleRoot} (`WORKFLOW_RALPH_OT_ROOT` → `WORKSPACE_ROOT` → module walk-up → cwd).
 * When the root cannot be resolved, this is a no-op and `restore()` does nothing.
 */
export function pinNxWorkspaceRootToOpenThrottle(
  env: NodeJS.ProcessEnv = process.env,
): PinNxWorkspaceRootResult {
  const otRoot = getOpenThrottleRoot(env);
  if (!otRoot) {
    return { restore: (): void => {}, workspaceRoot: undefined };
  }

  const previousRootPath = env[NX_WORKSPACE_ROOT_PATH_ENV];
  const previousDaemon = env.NX_DAEMON;
  const previousWorkspaceRoot = workspaceRoot;

  env[NX_WORKSPACE_ROOT_PATH_ENV] = otRoot;
  env.NX_DAEMON = `false`;
  setWorkspaceRoot(otRoot);

  const restore = (): void => {
    if (previousRootPath === undefined) {
      delete env[NX_WORKSPACE_ROOT_PATH_ENV];
    } else {
      env[NX_WORKSPACE_ROOT_PATH_ENV] = previousRootPath;
    }

    if (previousDaemon === undefined) {
      delete env.NX_DAEMON;
    } else {
      env.NX_DAEMON = previousDaemon;
    }

    setWorkspaceRoot(previousWorkspaceRoot);
  };

  return { restore, workspaceRoot: otRoot };
}

/**
 * @description Returns true when `dir` exists and is a directory. Never throws.
 */
const isDirectory = (dir: string): boolean => {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
};

/**
 * @description Resolves the OpenThrottle `node_modules/.bin` directory using {@link getOpenThrottleRoot}. Returns undefined when the root or bin directory cannot be found, so callers can leave PATH untouched.
 */
export function resolveOpenThrottleBinDir(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const root = getOpenThrottleRoot(env);
  if (!root) {
    return undefined;
  }

  const binDir = path.join(root, 'node_modules', '.bin');
  return isDirectory(binDir) ? binDir : undefined;
}

/**
 * @description Returns a copy of `env` with `dir` prepended to PATH. Returns `env` unchanged when `dir` is already on PATH so resolution stays idempotent.
 */
const prependDirToPath = (
  env: NodeJS.ProcessEnv,
  dir: string,
): NodeJS.ProcessEnv => {
  const currentPath = env.PATH ?? '';
  const parts = currentPath.split(path.delimiter).filter((p) => p.length > 0);
  if (parts.includes(dir)) {
    return env;
  }

  const nextPath =
    currentPath.length > 0 ? `${dir}${path.delimiter}${currentPath}` : dir;

  return { ...env, PATH: nextPath };
};

/**
 * @description Prepends the OpenThrottle `node_modules/.bin` directory ({@link resolveOpenThrottleBinDir}) to PATH so `pnpm exec workflow-ralph` resolves the binary from the OpenThrottle monorepo regardless of `cwd`, without relying on the dev shell PATH bleeding in. No-op when the bin directory cannot be resolved or is already on PATH.
 */
export function prependOpenThrottleBinToPath(
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const binDir = resolveOpenThrottleBinDir(env);
  if (binDir === undefined) {
    return env;
  }

  return prependDirToPath(env, binDir);
}

export const getWorkflowRunner = () => {};

export const parseWorkflowConfig = () => {};

export const runChildProcessAsync = async (): Promise<void> => {};

export const runProcessAsync = async (): Promise<void> => {};
