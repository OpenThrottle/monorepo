/**
 * Reusable worktree workflow: acquire target, run any loop, ensure commit, release.
 * Fan-out/fan-in: each run acquires one target, runs the loop, ensures commit guarantees, then releases.
 */

import type {
  ParentJobAcquireResult,
  ParentJobEnsureCommitResult,
  ParentJobHandoff,
  WorkflowLoopResult,
  WorktreeWorkflowOptions,
  WorktreeWorkflowResult,
} from '../types/worktree';
import {
  parentJobAcquireAndCreateBranch,
  parentJobEnsureCommitBeforeRelease,
} from './parent-job';

/**
 * @description Runs the full worktree workflow: acquire target and create branch, run the provided
 * loop (e.g. Ralph child job), ensure working tree is committed and (optionally) lint/test/typecheck
 * pass, then release the target. The target is always released if acquire succeeded, so locks are
 * not leaked on loop or ensure-commit failure.
 * Supports both sync and async tracker implementations (mutex-protected or Redis-backed).
 */
export async function runWorktreeWorkflow(
  options: WorktreeWorkflowOptions,
): Promise<WorktreeWorkflowResult> {
  const {
    tracker,
    acquire: acquireOptions,
    runLoop,
    ensureCommit: ensureCommitOptions = {},
  } = options;

  const acquire: ParentJobAcquireResult = await parentJobAcquireAndCreateBranch(
    tracker,
    acquireOptions,
  );

  if (!acquire.ok) {
    return { acquire, released: false };
  }

  const handoff: ParentJobHandoff = acquire.handoff;
  const { targetId } = handoff;
  const lockedBy = acquireOptions.lockedBy;

  let loopResult: WorkflowLoopResult;
  try {
    loopResult = await runLoop(handoff);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    loopResult = { ok: false, reason: msg };
  }

  let ensureCommit: ParentJobEnsureCommitResult | undefined;
  if (loopResult.ok) {
    try {
      ensureCommit = await parentJobEnsureCommitBeforeRelease(
        handoff,
        ensureCommitOptions,
      );
    } catch (error) {
      // ensureCommit shells out via spawnSync git, which can throw. Treat any
      // throw as a failed ensure-commit so the target below is still released
      // (matching the runLoop guard); never leak the lock on the commit tail.
      const msg = error instanceof Error ? error.message : String(error);
      ensureCommit = { detail: msg, ok: false, reason: 'working_tree_dirty' };
    }
  }

  const releaseResult = await tracker.release({ id: targetId, lockedBy });
  const released = releaseResult.ok;

  return {
    acquire,
    ensureCommit,
    loop: loopResult,
    released,
  };
}
