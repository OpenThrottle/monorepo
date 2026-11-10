/**
 * Which git checkout a hook invocation belongs to.
 *
 * Hooks used to take the project directory the agent reported as the repo root and trust it. That
 * directory is wherever the session was LAUNCHED, which is not always a checkout: a session started
 * one level above the repo (a plain container folder) still runs user-scoped plugin hooks, and its
 * tool calls carry a `cwd` inside the real checkout. Scope and branch were then judged against the
 * container folder — no `skills/`, no git — so the repo's own skills were stamped `third-party` with
 * an empty branch (OT plan 25f11313).
 *
 * Synchronous, dependency-free and fail-open: it runs inside bundled hooks on every Skill call.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * @description Walks up from `dir` (inclusive) to the nearest directory holding a `.git` entry — a
 * directory in a primary clone, a file in a linked worktree. Null at the filesystem root.
 */
const findGitAncestor = (dir: string): string | null => {
  if (fs.existsSync(path.join(dir, '.git'))) {
    return dir;
  }
  const parent = path.dirname(dir);
  if (parent === dir) {
    return null;
  }
  return findGitAncestor(parent);
};

/**
 * @description The root of the git checkout containing `dir`, or null when `dir` is missing,
 * relative, or not inside a checkout. Never throws.
 * @public
 */
export const resolveCheckoutRoot = (dir: string | null): string | null => {
  if (dir === null || dir === '' || !path.isAbsolute(dir)) {
    return null;
  }
  try {
    return findGitAncestor(path.resolve(dir));
  } catch {
    return null;
  }
};

/**
 * @description The directory scope, privacy and branch should be judged against: the checkout the
 * project directory sits in when it is one, else the checkout the payload's `cwd` sits in, else the
 * project directory unchanged (the old behaviour, so nothing regresses where neither resolves).
 * @public
 */
export const resolveHookRepoRoot = ({
  payloadCwd,
  projectDir,
}: {
  readonly payloadCwd: string | null;
  readonly projectDir: string;
}): string => {
  return (
    resolveCheckoutRoot(projectDir) ??
    resolveCheckoutRoot(payloadCwd) ??
    projectDir
  );
};
