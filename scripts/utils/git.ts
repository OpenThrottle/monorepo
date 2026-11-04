/**
 * @description Small git helpers shared by the worktree/setup scripts.
 * Dependency-free (node builtins + lib/exec only) — these run during worktree
 * provisioning, before `pnpm install`.
 */
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { run } from './exec.ts';

/** Trimmed stdout of a git command, or undefined on any failure. */
export const gitOutput = (args: string[], cwd?: string): string | undefined => {
  const result = run('git', args, { allowFailure: true, cwd });

  return result.exitCode === 0 ? result.stdout : undefined;
};

/**
 * True when cwd is a LINKED worktree (not the primary checkout). Primary
 * checkout: --git-dir and --git-common-dir resolve to the same path; a linked
 * worktree's per-worktree admin dir (…/.git/worktrees/<name>) differs from
 * the shared common dir.
 */
export const isLinkedWorktree = (): boolean => {
  if (gitOutput(['rev-parse', '--is-inside-work-tree']) === undefined) {
    return false;
  }

  const gitDir = gitOutput(['rev-parse', '--git-dir']);
  const commonDir = gitOutput(['rev-parse', '--git-common-dir']);

  if (gitDir === undefined || commonDir === undefined) {
    return false;
  }

  try {
    return realpathSync(gitDir) !== realpathSync(commonDir);
  } catch {
    return false;
  }
};

/**
 * The primary checkout directory (parent of the shared git common dir), or
 * undefined outside a git checkout. Resolved from `cwd` when given, otherwise
 * from the process's own working directory.
 */
export const primaryCheckoutDir = (cwd?: string): string | undefined => {
  const commonDir = gitOutput(['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd); // prettier-ignore

  return commonDir === undefined ? undefined : dirname(commonDir);
};

/** Repo-root file listing noise-only commits `git blame` should look through. */
export const BLAME_IGNORE_REVS_FILE = '.git-blame-ignore-revs';

/**
 * Point local `git blame` at .git-blame-ignore-revs. GitHub honors the root
 * file on its own; local git only does so via `blame.ignoreRevsFile`.
 *
 * The hazard this exists to avoid: git fails FATALLY (`could not open object
 * name list`) when that config names a file that is not there, and a linked
 * worktree writes to the PRIMARY checkout's shared config. Setting it from a
 * worktree whose branch has the file therefore breaks `git blame` in a primary
 * checkout whose branch does not — observed, not theoretical.
 *
 * So the existence check is deliberately made against the checkout that owns
 * the config, not against the caller's cwd. Provisioning a worktree is simply
 * a no-op until the file has landed on the primary checkout's branch.
 *
 * Idempotent and never throws: returns true when the config ends up set.
 * `git config --unset blame.ignoreRevsFile` is the escape hatch.
 */
export const configureBlameIgnoreRevs = (repoRoot: string): boolean => {
  const configRoot = primaryCheckoutDir(repoRoot) ?? repoRoot;

  if (!existsSync(join(configRoot, BLAME_IGNORE_REVS_FILE))) {
    return false;
  }

  const current = gitOutput(
    ['config', '--get', 'blame.ignoreRevsFile'],
    configRoot,
  );
  if (current === BLAME_IGNORE_REVS_FILE) {
    return true;
  }

  return (
    gitOutput(
      ['config', 'blame.ignoreRevsFile', BLAME_IGNORE_REVS_FILE],
      configRoot,
    ) !== undefined
  );
};
