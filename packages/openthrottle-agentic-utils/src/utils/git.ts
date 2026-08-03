import { execFileSync } from 'node:child_process';

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
