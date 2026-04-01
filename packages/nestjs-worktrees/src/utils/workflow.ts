/**
 * Reusable worktree workflow: acquire target, run any loop, ensure commit, release.
 * Fan-out/fan-in: each run acquires one target, runs the loop, ensures commit guarantees, then releases.
 */

import type {
  ParentJobAcquireResult,
  ParentJobEnsureCommitResult,
  ParentJobHandoff,
  PushBranchResult,
  WorkflowLoopResult,
  WorktreeWorkflowOptions,
  WorktreeWorkflowResult,
} from '../types/worktree';
import {
  parentJobAcquireAndCreateBranch,
  parentJobEnsureCommitBeforeRelease,
  pushBranchToRemote,
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
    ensureCommit = parentJobEnsureCommitBeforeRelease(
      handoff,
      ensureCommitOptions,
    );
  }

  let pushResult: PushBranchResult | undefined;
  if (loopResult.ok) {
    pushResult = pushBranchToRemote(handoff.worktreePath, handoff.branchName);
  }

  const releaseResult = await tracker.release({ id: targetId, lockedBy });
  const released = releaseResult.ok;

  return {
    acquire,
    ensureCommit,
    loop: loopResult,
    pushResult,
    released,
  };
}
