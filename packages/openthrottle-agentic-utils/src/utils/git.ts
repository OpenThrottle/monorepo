import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Best-effort current git branch for the given working directory.
 *
 * Runs `git rev-parse --abbrev-ref HEAD`, trims stdout, and returns `null` when
 * git fails, the result is blank, or the result is the literal `HEAD` (detached).
 * Silent on failure — callers omit rather than warn.
 *
 * @public
 */
export function resolveGitBranchFromCwd(
  cwd: string = process.cwd(),
): string | null {
  try {
    const raw = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const branch = raw.trim();
    if (branch === '' || branch === 'HEAD') {
      return null;
    }
    return branch;
  } catch {
    return null;
  }
}

/**
 * Best-effort absolute, symlink-resolved git common directory for `cwd`.
 *
 * Every linked worktree of a repository shares one common dir (the primary checkout's `.git`),
 * so two directories with the same common dir are checkouts of the same repository. Returns
 * `undefined` when git is unavailable or `cwd` is not inside a repository.
 *
 * @public
 */
export function resolveGitCommonDirFromCwd(cwd: string): string | undefined {
  try {
    const raw = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (raw === '') {
      return undefined;
    }
    return realpathSync(resolve(cwd, raw));
  } catch {
    return undefined;
  }
}
