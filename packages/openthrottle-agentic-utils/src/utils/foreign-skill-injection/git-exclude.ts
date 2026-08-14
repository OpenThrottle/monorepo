/**
 * @description Manages a marker-bracketed block inside a repo's local
 * `.git/info/exclude` — the untracked exclude file — so injected skill paths
 * are invisible to `git status` WITHOUT modifying any tracked file (never
 * `.gitignore`, never a global `core.excludesFile`). Cleanliness is a property
 * of this block being present, independent of teardown ever running.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { GIT_EXCLUDE_BEGIN_MARKER, GIT_EXCLUDE_END_MARKER } from './types.ts';

/**
 * @description Resolves the repo's `info/exclude` path via
 * `git rev-parse --git-path info/exclude`, which is correct for plain repos,
 * linked worktrees, and submodules alike. Returns `undefined` when the path is
 * not a git repository (nothing to keep clean).
 *
 * @public
 */
export const resolveGitExcludePath = (repoPath: string): string | undefined => {
  try {
    const output = execFileSync(
      'git',
      ['-C', repoPath, 'rev-parse', '--git-path', 'info/exclude'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    if (output === '') {
      return undefined;
    }
    // git returns a path relative to repoPath (or absolute); resolve handles both.
    return resolve(repoPath, output);
  } catch {
    return undefined;
  }
};

/** Splits into lines, dropping a single trailing newline's empty tail. */
const toLines = (content: string): string[] => {
  const lines = content.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
};

/**
 * Returns `lines` with any existing managed block removed, including a single
 * blank separator immediately preceding the begin marker. Tolerant of a legacy
 * block missing its end marker (falls back to the next blank line / EOF).
 */
const stripManagedBlock = (lines: readonly string[]): string[] => {
  const begin = lines.indexOf(GIT_EXCLUDE_BEGIN_MARKER);
  if (begin === -1) {
    return [...lines];
  }

  let end = lines.indexOf(GIT_EXCLUDE_END_MARKER, begin + 1);
  if (end === -1) {
    end = begin;
    for (let i = begin + 1; i < lines.length; i += 1) {
      if (lines[i] === '') {
        break;
      }
      end = i;
    }
  }

  let start = begin;
  if (begin > 0 && lines[begin - 1] === '') {
    start = begin - 1;
  }

  return [...lines.slice(0, start), ...lines.slice(end + 1)];
};

/**
 * @description Writes (or rewrites) the managed exclude block listing
 * `relativePaths` (repo-relative POSIX). Each is anchored to the repo root with
 * a leading `/`. Idempotent: an identical call produces byte-identical output.
 * An empty `relativePaths` removes the block entirely. No-op (returns `false`)
 * when the path is not a git repo.
 *
 * @public
 */
export const writeManagedExcludeBlock = (
  repoPath: string,
  relativePaths: readonly string[],
): boolean => {
  const excludePath = resolveGitExcludePath(repoPath);
  if (excludePath === undefined) {
    return false;
  }

  const existing = existsSync(excludePath)
    ? readFileSync(excludePath, 'utf8')
    : '';
  const withoutBlock = stripManagedBlock(toLines(existing));

  const nextLines = [...withoutBlock];
  if (relativePaths.length > 0) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== '') {
      nextLines.push('');
    }
    nextLines.push(GIT_EXCLUDE_BEGIN_MARKER);
    for (const relativePath of [...relativePaths].sort()) {
      nextLines.push(`/${relativePath}`);
    }
    nextLines.push(GIT_EXCLUDE_END_MARKER);
  }

  mkdirSync(dirname(excludePath), { recursive: true });
  const body = nextLines.length > 0 ? `${nextLines.join('\n')}\n` : '';
  writeFileSync(excludePath, body, 'utf8');
  return true;
};

/**
 * @description Removes the managed exclude block, preserving all user-owned
 * lines. No-op when absent or not a git repo.
 *
 * @public
 */
export const removeManagedExcludeBlock = (repoPath: string): void => {
  writeManagedExcludeBlock(repoPath, []);
};
