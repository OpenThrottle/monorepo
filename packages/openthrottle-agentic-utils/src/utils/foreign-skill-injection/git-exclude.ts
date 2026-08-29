/**
 * @description Manages marker-bracketed blocks inside a repo's local
 * `.git/info/exclude` — the untracked exclude file — so paths OpenThrottle writes for its own
 * bookkeeping are invisible to `git status` WITHOUT modifying any tracked file (never
 * `.gitignore`, never a global `core.excludesFile`). Cleanliness is a property of the block being
 * present, independent of teardown ever running.
 *
 * Blocks are **per owner**. More than one OT feature writes into a foreign repo, and each replaces
 * its own block wholesale on every write — so a single shared marker would mean whichever feature
 * wrote last silently deleted the other's block. Each owner gets its own marker pair and touches
 * only that one.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { GitExcludeOwner } from './types.ts';

/**
 * Marker text for an owner's block. The rendering for
 * {@link GIT_EXCLUDE_OWNER.FOREIGN_SKILL_INJECTION} is byte-identical to the markers shipped before
 * blocks became per-owner, so exclude files already on disk keep parsing and no repo needs
 * migrating.
 */
const beginMarkerFor = (owner: GitExcludeOwner): string =>
  `# BEGIN OpenThrottle ${owner} (managed — do not edit)`;

const endMarkerFor = (owner: GitExcludeOwner): string =>
  `# END OpenThrottle ${owner} (managed)`;

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
const stripManagedBlock = (
  lines: readonly string[],
  owner: GitExcludeOwner,
): string[] => {
  const begin = lines.indexOf(beginMarkerFor(owner));
  if (begin === -1) {
    return [...lines];
  }

  let end = lines.indexOf(endMarkerFor(owner), begin + 1);
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
 * @description Writes (or rewrites) `owner`'s managed exclude block listing `relativePaths`
 * (repo-relative POSIX). Each is anchored to the repo root with a leading `/`. Idempotent: an
 * identical call produces byte-identical output. An empty `relativePaths` removes that owner's
 * block entirely. No-op (returns `false`) when the path is not a git repo.
 *
 * Only `owner`'s block is touched — every other owner's block is preserved byte for byte.
 *
 * @public
 */
export const writeManagedExcludeBlock = (
  repoPath: string,
  relativePaths: readonly string[],
  owner: GitExcludeOwner,
): boolean => {
  const excludePath = resolveGitExcludePath(repoPath);
  if (excludePath === undefined) {
    return false;
  }

  const existing = existsSync(excludePath)
    ? readFileSync(excludePath, 'utf8')
    : '';
  const withoutBlock = stripManagedBlock(toLines(existing), owner);

  const nextLines = [...withoutBlock];
  if (relativePaths.length > 0) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== '') {
      nextLines.push('');
    }
    nextLines.push(beginMarkerFor(owner));
    for (const relativePath of [...relativePaths].sort()) {
      nextLines.push(`/${relativePath}`);
    }
    nextLines.push(endMarkerFor(owner));
  }

  mkdirSync(dirname(excludePath), { recursive: true });
  const body = nextLines.length > 0 ? `${nextLines.join('\n')}\n` : '';
  writeFileSync(excludePath, body, 'utf8');
  return true;
};

/**
 * @description Removes `owner`'s managed exclude block, preserving all user-owned lines and every
 * other owner's block. No-op when absent or not a git repo.
 *
 * @public
 */
export const removeManagedExcludeBlock = (
  repoPath: string,
  owner: GitExcludeOwner,
): void => {
  writeManagedExcludeBlock(repoPath, [], owner);
};
