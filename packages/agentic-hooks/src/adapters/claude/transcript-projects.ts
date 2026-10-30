/**
 * Which Claude Code project directories the backfill may read. Claude Code
 * keeps one directory per working directory under `<projects dir>/<slug>/`,
 * where the slug is the absolute path with every non-alphanumeric character
 * replaced by `-` (so `/a/.b/c` becomes `-a--b-c`). The backfill never lists
 * the projects directory: it derives the slugs of THIS repository's checkouts
 * and opens only those, so another project's transcripts are never touched.
 *
 * The checkouts are the repository root plus its git worktrees, which `git
 * worktree list` reports from the repository itself — an authoritative answer,
 * unlike guessing at sibling directories by name. Worktrees are what most agent
 * work happens in, and each gets its own transcript directory.
 *
 * Two guards keep a slug collision (`/a/b.c` and `/a/b-c` share a slug) from
 * leaking a foreign project in: the resolved directory must stay inside the
 * projects directory after symlinks are followed, and `transcriptBelongsTo`
 * checks a transcript's own recorded `cwd` against the checkouts.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Claude Code's slug for a working directory. Two spellings are tried by
 * `slugsForCheckout`, because the narrower `/`-and-`.` rule that older notes
 * describe is a subset of this one and differs only for paths containing
 * characters such as `_` or a space.
 *
 * @public
 */
export const claudeProjectSlug = (absolutePath: string): string =>
  absolutePath.replace(/[^a-zA-Z0-9]/g, '-');

const narrowSlug = (absolutePath: string): string =>
  absolutePath.replace(/[/.]/g, '-');

/** @public */
export const defaultClaudeProjectsDir = (): string =>
  path.join(os.homedir(), '.claude', 'projects');

/**
 * Parse `git worktree list --porcelain` output into worktree paths. Bare and
 * prunable entries are dropped: neither has a live checkout to have run in.
 *
 * @public
 */
export const parseWorktreeList = (porcelain: string): readonly string[] => {
  const paths: string[] = [];
  for (const block of porcelain.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/);
    const worktree = lines.find((line) => line.startsWith('worktree '));
    if (
      worktree === undefined ||
      lines.includes('bare') ||
      lines.some((line) => line.startsWith('prunable'))
    ) {
      continue;
    }
    paths.push(worktree.slice('worktree '.length));
  }
  return paths;
};

/**
 * The repository's checkouts, from `git worktree list` run in `repoRoot`.
 * Empty when git fails (not a repository, git missing), which leaves only
 * `repoRoot` itself.
 *
 * @public
 */
export const listGitWorktrees = (repoRoot: string): readonly string[] => {
  try {
    return parseWorktreeList(
      execFileSync('git', ['worktree', 'list', '--porcelain'], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 5000,
      }),
    );
  } catch {
    return [];
  }
};

/**
 * One project directory the backfill may read.
 *
 * @public
 */
export interface OwnedProject {
  /** The checkout whose transcripts these are. */
  readonly checkout: string;
  /** Absolute transcript directory, inside the projects directory. */
  readonly dir: string;
  /** Directory name, used as the per-project key in reports. */
  readonly slug: string;
}

const realpathOrNull = (target: string): string | null => {
  try {
    return fs.realpathSync(target);
  } catch {
    return null;
  }
};

const isInside = (child: string, parent: string): boolean => {
  const relative = path.relative(parent, child);
  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
};

/**
 * The existing transcript directories of `checkouts`, nothing else. A checkout
 * with no directory (never opened in Claude Code) is simply absent. A slug that
 * resolves outside `projectsDir` (a symlink) is refused.
 *
 * @public
 */
export const resolveOwnedProjects = ({
  checkouts,
  projectsDir,
}: {
  checkouts: readonly string[];
  projectsDir: string;
}): readonly OwnedProject[] => {
  const root = realpathOrNull(projectsDir);
  if (root === null) {
    return [];
  }
  const found = new Map<string, OwnedProject>();
  for (const checkout of checkouts) {
    const absolute = path.resolve(checkout);
    for (const slug of new Set([
      claudeProjectSlug(absolute),
      narrowSlug(absolute),
    ])) {
      const dir = path.join(projectsDir, slug);
      const real = realpathOrNull(dir);
      if (real === null || !isInside(real, root) || found.has(real)) {
        continue;
      }
      found.set(real, { checkout: absolute, dir: real, slug });
    }
  }
  return [...found.values()].sort((left, right) =>
    left.slug.localeCompare(right.slug),
  );
};

/**
 * The checkouts a backfill covers: `repoRoot` and, unless `includeWorktrees` is
 * false, every worktree git lists for it. `listWorktrees` is injectable so a
 * test never shells out.
 *
 * @public
 */
export const resolveCheckouts = ({
  includeWorktrees,
  listWorktrees = listGitWorktrees,
  repoRoot,
}: {
  includeWorktrees: boolean;
  listWorktrees?: (repoRoot: string) => readonly string[];
  repoRoot: string;
}): readonly string[] =>
  [
    ...new Set(
      [repoRoot, ...(includeWorktrees ? listWorktrees(repoRoot) : [])].map(
        (checkout) => path.resolve(checkout),
      ),
    ),
  ].sort();

/**
 * Is a transcript's recorded working directory inside one of the checkouts?
 * `null` (no `cwd` seen) is treated as inside: the directory itself already
 * passed `resolveOwnedProjects`, and refusing every cwd-less file would turn a
 * missing field into silent data loss.
 *
 * @public
 */
export const transcriptBelongsTo = ({
  checkouts,
  cwd,
}: {
  checkouts: readonly string[];
  cwd: string | null;
}): boolean => {
  if (cwd === null) {
    return true;
  }
  const resolved = path.resolve(cwd);
  // A transcript records the cwd as the process saw it, which may be a symlinked
  // spelling of the checkout (macOS `/var` vs `/private/var`), so both count.
  const roots = checkouts.flatMap((checkout) => {
    const real = realpathOrNull(checkout);
    return real === null ? [checkout] : [checkout, real];
  });
  return roots.some((root) => resolved === root || isInside(resolved, root));
};
