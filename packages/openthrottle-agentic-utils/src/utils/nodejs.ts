import * as fs from 'node:fs';
import * as path from 'node:path';

import { getOpenThrottleRoot } from './workflow.js';

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
