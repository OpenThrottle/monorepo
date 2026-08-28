/**
 * @description Small git helpers shared by the worktree/setup scripts.
 * Dependency-free (node builtins + lib/exec only) — these run during worktree
 * provisioning, before `pnpm install`.
 */
import { realpathSync } from 'node:fs';
import { dirname } from 'node:path';

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
 * undefined outside a git checkout.
 */
export const primaryCheckoutDir = (): string | undefined => {
  const commonDir = gitOutput(['rev-parse', '--path-format=absolute', '--git-common-dir']); // prettier-ignore

  return commonDir === undefined ? undefined : dirname(commonDir);
};
