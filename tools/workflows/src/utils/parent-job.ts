/**
 * Parent job: acquire a worktree target and create a branch for the child (Ralph) job.
 * After child completes, ensure the working tree is committed/clean before release.
 *
 * Note: ensureCommit is commit/clean-only. The lint/typecheck/test enforcement it used to
 * run (the removed ENSURE_COMMIT_NX_CHECKS) is now owned by the Stage (d) after-phase hooks,
 * which run the TARGET repo's own checks rather than hardcoded OpenThrottle nx targets.
 */

import { spawnSync } from 'child_process';
import type {
  IWorktreeTargetsTracker,
  ParentJobAcquireOptions,
  ParentJobAcquireResult,
  ParentJobEnsureCommitOptions,
  ParentJobEnsureCommitResult,
  ParentJobHandoff,
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
export function slugifyForBranch(title: string): string {
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
 * @description Creates a new branch in the worktree at worktreePath. Returns true on success.
 */
export function createBranchInWorktree(
  worktreePath: string,
  branchName: string,
  baseBranch: string,
): { ok: true } | { ok: false; stderr: string } {
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
  return { ok: false, stderr };
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
  return { handoff, ok: true };
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
 * @description Parent job step: after child completes, ensure all changes are committed and the
 * working tree is clean before the caller releases the worktree target. Call this before releasing
 * the target; on success, release the target.
 *
 * This step is commit/clean-only. It intentionally no longer runs lint/typecheck/test (the removed
 * ENSURE_COMMIT_NX_CHECKS): that enforcement is owned by the Stage (d) after-phase hooks, which run
 * the TARGET repo's own checks rather than hardcoded OpenThrottle nx targets. The `options` are
 * accepted for backwards-compatible call sites but no longer trigger any checks.
 */
export async function parentJobEnsureCommitBeforeRelease(
  handoff: ParentJobHandoff,
  _options: ParentJobEnsureCommitOptions = {},
): Promise<ParentJobEnsureCommitResult> {
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
