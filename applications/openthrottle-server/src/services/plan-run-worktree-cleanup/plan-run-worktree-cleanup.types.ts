/**
 * @description Input and outcome of the after-run worktree policy.
 */

import type { ProvisionedPlanRunWorktree } from '../plan-run-worktree-provision/plan-run-worktree-provision.types.ts';
import type { PlanRunWorktreeTeardownResult } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.types.ts';
import type { PLAN_RUN_WORKTREE_CLEANUP_SKIP } from './plan-run-worktree-cleanup.constants.ts';

export interface PlanRunWorktreeCleanupParams {
  readonly planId: string;
  /** The PR the host finalize step opened, when it opened one. */
  readonly prNumber: number | undefined;
  /** The orchestrator's finished or failed reason (`workflow_complete`, `workflow_cancelled`, …). */
  readonly reason: string;
  /** The worktree the run was provisioned into; null when it ran in the base checkout. */
  readonly worktree: ProvisionedPlanRunWorktree | null;
}

export type PlanRunWorktreeCleanupSkip =
  (typeof PLAN_RUN_WORKTREE_CLEANUP_SKIP)[keyof typeof PLAN_RUN_WORKTREE_CLEANUP_SKIP];

/** The policy declined to attempt a teardown; `detail` is the reason written to plan output. */
export interface PlanRunWorktreeCleanupSkipped {
  readonly detail: string;
  readonly kind: 'skipped';
  readonly skip: PlanRunWorktreeCleanupSkip;
}

/** The policy attempted a teardown; `result` is what the teardown service answered. */
export interface PlanRunWorktreeCleanupAttempted {
  readonly kind: 'attempted';
  readonly result: PlanRunWorktreeTeardownResult;
}

export type PlanRunWorktreeCleanupOutcome =
  PlanRunWorktreeCleanupAttempted | PlanRunWorktreeCleanupSkipped;
