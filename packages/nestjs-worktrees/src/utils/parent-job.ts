/**
 * Parent job: acquire a worktree target and create a branch for the child (Ralph) job.
 * After child completes, ensure the working tree is committed/clean before release.
 *
 * Note: ensureCommit is commit/clean-only. The lint/typecheck/test enforcement it used to run
 * (the removed ENSURE_COMMIT_NX_CHECKS) is now owned by the Stage (d) after-phase hooks, which run
 * the TARGET repo's own checks rather than hardcoded OpenThrottle nx targets.
 *
 * Thread-safety: All git spawns use explicit worktreePath (git -C). Path comes from
 * acquireResult.target.path and handoff; no process.cwd() or shared path; safe for concurrent jobs.
 */

import { spawnSync } from 'child_process';
import type {
  IWorktreeTargetsTracker,
  ParentJobAcquireOptions,
  ParentJobAcquireResult,
  ParentJobEnsureCommitOptions,
  ParentJobEnsureCommitResult,
  ParentJobHandoff,
  PushBranchResult,
} from '../types/worktree';

const DEFAULT_BASE_BRANCH = 'main';

/** Maximum length for the slugified plan title portion of the branch name. */
const MAX_SLUG_LENGTH = 50;

/**
 * @description Converts a plan title to a valid git branch name slug.
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes consecutive hyphens
 * - Trims hyphens from start/end
 * - Truncates to max 50 characters (leaving room for ralph/ prefix and uniqueness suffix)
 */
function slugifyForBranch(title: string): string {
  if (!title || title.trim().length === 0) {
    return '';
  }

  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-$/, '');
}

/** Length of the uniqueness suffix appended to slugified plan titles. */
const UNIQUENESS_SUFFIX_LENGTH = 6;

/**
 * @description Derives a unique branch name. When planTitle is provided, uses
 * `ralph/{slugified-title}-{suffix}` format (e.g., `ralph/human-readable-branch-names-a1b2c3`).
 * Falls back to `ralph/{lockedBy-slug}-{timestamp}` when no title is provided.
 */
export function deriveBranchName(lockedBy: string, planTitle?: string): string {
  if (planTitle) {
    const slug = slugifyForBranch(planTitle);

    if (slug.length > 0) {
      const suffix = Date.now().toString(36).slice(-UNIQUENESS_SUFFIX_LENGTH);

      return `ralph/${slug}-${suffix}`;
    }
  }

  const slug = lockedBy.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 12);

  return `ralph/${slug}-${Date.now()}`;
}

/**
 * @description Rejects a git argument that would be parsed as an option rather than a
 * positional value. An empty value, or one beginning with `-` (e.g. `--track`, `-f`),
 * is unsafe to pass as a branch name, base ref, or path because git interprets it as a
 * flag. This guards against git-arg (option) injection from explicit/untrusted inputs.
 */
function isOptionLikeArg(value: string): boolean {
  return value.length === 0 || value.startsWith('-');
}

/**
 * @description Creates a new branch in the worktree at worktreePath. Returns true on success.
 *
 * Hardening: `branchName`, `baseBranch`, and `worktreePath` are rejected up front if they
 * are empty or begin with `-`, so an explicit (un-slugified) branch name or a malicious
 * target path cannot smuggle a git option (e.g. `--track`) into the argv. (A `--` separator
 * is not usable here: for `git checkout -b <branch> <start-point>`, git would treat anything
 * after `--` as a pathspec rather than the start-point ref, so the leading-dash guard is the
 * correct defense for the ref arguments.)
 */
export function createBranchInWorktree(
  worktreePath: string,
  branchName: string,
  baseBranch: string,
): { ok: true } | { ok: false; stderr: string } {
  if (isOptionLikeArg(worktreePath)) {
    return {
      ok: false,
      stderr: `unsafe worktree path (option-like or empty): ${worktreePath}`,
    };
  }

  if (isOptionLikeArg(branchName)) {
    return {
      ok: false,
      stderr: `unsafe branch name (option-like or empty): ${branchName}`,
    };
  }

  if (isOptionLikeArg(baseBranch)) {
    return {
      ok: false,
      stderr: `unsafe base branch (option-like or empty): ${baseBranch}`,
    };
  }

  const child = spawnSync(
    'git',
    ['-C', worktreePath, 'checkout', '-b', branchName, baseBranch],
    { encoding: 'utf-8' },
  );

  if (child.status === 0) {
    return { ok: true };
  }

  const stderr = (
    child.stderr ??
    child.error?.message ??
    'unknown error'
  ).trim();

  return {
    ok: false,
    stderr,
  };
}

/**
 * @description Parent job step: acquire an available worktree target (lock it) and create
 * a new branch there. Returns handoff data for the child job or failure.
 * On create-branch failure, the target is released before returning.
 * Supports both sync and async tracker implementations (mutex-protected or Redis-backed).
 */
export async function parentJobAcquireAndCreateBranch(
  tracker: IWorktreeTargetsTracker,
  options: ParentJobAcquireOptions,
): Promise<ParentJobAcquireResult> {
  const {
    lockedBy,
    baseBranch = DEFAULT_BASE_BRANCH,
    branchName: explicitBranch,
    planTitle,
    worktreeId,
  } = options;

  const acquireResult = await tracker.acquire({
    id: worktreeId,
    lockedBy,
  });

  if (!acquireResult.ok) {
    return {
      detail: acquireResult.reason,
      ok: false,
      reason: 'acquire_failed',
    };
  }

  const { id: targetId, path: worktreePath } = acquireResult.target;
  const branchName = explicitBranch ?? deriveBranchName(lockedBy, planTitle);

  const branchResult = createBranchInWorktree(
    worktreePath,
    branchName,
    baseBranch,
  );

  if (!branchResult.ok) {
    await tracker.release({ id: targetId, lockedBy });
    return {
      detail: branchResult.stderr,
      ok: false,
      reason: 'create_branch_failed',
    };
  }

  const handoff: ParentJobHandoff = {
    branchName,
    targetId,
    worktreePath,
  };

  return {
    handoff,
    ok: true,
  };
}

/**
 * @description Returns true if the worktree has no uncommitted changes (clean).
 */
export function isWorktreeClean(worktreePath: string): boolean {
  const child = spawnSync(
    'git',
    ['-C', worktreePath, 'status', '--porcelain'],
    { encoding: 'utf-8' },
  );

  if (child.status !== 0) return false;

  const out = (child.stdout ?? '').trim();

  return out.length === 0;
}

/**
 * @description Returns true if the current branch has commits ahead of the remote.
 * Used to determine if there's work to push before releasing the worktree.
 *
 * Fail-open contract (intentional): the function returns `true` (i.e. "treat as
 * having work to push") in two distinct non-zero-exit cases, so a caller using it
 * to gate a push never *suppresses* a push that might be needed:
 *
 *   1. No upstream configured. A fresh `ralph/*` branch created in the worktree has
 *      no `@{upstream}`, so `rev-list @{upstream}..HEAD` exits non-zero with a
 *      "no upstream configured" message. This is the normal first-push case and is
 *      genuinely "has work" — the branch's commits exist only locally. The caller
 *      should push with `-u` (as `pushBranchToRemote` already does) to set it.
 *   2. Genuine git errors (not a repo, bad ref, etc.). We cannot prove there is no
 *      work, so we err toward pushing rather than silently dropping commits.
 *
 * `workflow.ts` does not currently call this (it always pushes on loop success); the
 * fail-open behavior is the safe default for any future gating caller. If a caller
 * needs to *distinguish* "no upstream" from a real error (e.g. for logging), inspect
 * stderr for the no-upstream message rather than relying on the boolean alone.
 */
export function hasCommitsAheadOfRemote(worktreePath: string): boolean {
  const child = spawnSync(
    'git',
    ['-C', worktreePath, 'rev-list', '--count', '@{upstream}..HEAD'],
    { encoding: 'utf-8' },
  );

  if (child.status !== 0) {
    // Fail open: no upstream (normal first push) and genuine errors both land
    // here; treat as "has work to push" so a gating caller never drops commits.
    return true;
  }

  const count = parseInt((child.stdout ?? '0').trim(), 10);

  return count > 0;
}

/**
 * @description Pushes the current branch to origin with --set-upstream.
 * Used to preserve work before releasing the worktree, especially when ensure-commit fails.
 */
export function pushBranchToRemote(
  worktreePath: string,
  branchName: string,
): PushBranchResult {
  const child = spawnSync(
    'git',
    ['-C', worktreePath, 'push', '-u', 'origin', branchName],
    { encoding: 'utf-8' },
  );

  if (child.status === 0) {
    return { ok: true };
  }

  const stderr = (
    child.stderr ??
    child.error?.message ??
    'unknown error'
  ).trim();

  return {
    ok: false,
    stderr,
  };
}

/**
 * @description Parent job step: after child completes, ensure all changes are committed and the
 * working tree is clean before the caller releases the worktree target. Call this before releasing
 * the target; on success, release the target.
 *
 * This step is commit/clean-only. It intentionally no longer runs lint/typecheck/test (the removed
 * ENSURE_COMMIT_NX_CHECKS): that enforcement is owned by the Stage (d) after-phase hooks, which run
 * the TARGET repo's own checks rather than hardcoded OpenThrottle nx targets. The `options` are
 * accepted for backwards-compatible call sites but no longer trigger any checks.
 */
export function parentJobEnsureCommitBeforeRelease(
  handoff: ParentJobHandoff,
  _options: ParentJobEnsureCommitOptions = {},
): ParentJobEnsureCommitResult {
  const { worktreePath } = handoff;

  if (!isWorktreeClean(worktreePath)) {
    const child = spawnSync('git', ['-C', worktreePath, 'status', '--short'], {
      encoding: 'utf-8',
    });

    const detail = child.stdout?.trim() || undefined;
    return {
      detail,
      ok: false,
      reason: 'working_tree_dirty',
    };
  }

  return { ok: true };
}
