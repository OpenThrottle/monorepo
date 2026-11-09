/**
 * @description Outcomes of tearing down a plan-run worktree. Every call gets exactly one, and the
 * service never throws: a worktree that cannot be removed is reported as kept, with the reason.
 */

import type { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from './plan-run-worktree-teardown.constants.ts';

/** The guard verdicts that keep a worktree in place. */
export type PlanRunWorktreeKeptOutcome =
  | typeof PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_ACTIVE_RUN
  | typeof PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_DIRTY
  | typeof PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_NOT_PLAN_RUN_WORKTREE
  | typeof PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_PRIMARY
  | typeof PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_UNPUSHED;

export interface TeardownPlanRunWorktreeParams {
  /** Absolute path of the checkout the worktree was created from; removal runs from here. */
  readonly baseCheckoutPath: string;
  /** Absolute path of the worktree to remove. */
  readonly worktreePath: string;
}

interface PlanRunWorktreeResultBase {
  readonly worktreePath: string;
}

/** A guard refused the removal. `detail` says why, in a sentence a plan_output line can carry. */
export interface PlanRunWorktreeKept extends PlanRunWorktreeResultBase {
  readonly detail: string;
  readonly outcome: PlanRunWorktreeKeptOutcome;
}

/** Every guard passed; nothing was removed (assessment only). */
export interface PlanRunWorktreeRemovable extends PlanRunWorktreeResultBase {
  readonly branch: string | null;
  readonly outcome: typeof PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE;
}

/** The worktree directory is gone; `branch` still exists. */
export interface PlanRunWorktreeRemoved extends PlanRunWorktreeResultBase {
  readonly branch: string | null;
  readonly outcome: typeof PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED;
}

/** A guard could not be evaluated or the destroy action failed. The worktree is still there. */
export interface PlanRunWorktreeTeardownFailed extends PlanRunWorktreeResultBase {
  readonly detail: string;
  readonly outcome: typeof PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.FAILED;
}

/** What {@link PlanRunWorktreeTeardownService.assess} answers: the guards' verdict, nothing removed. */
export type PlanRunWorktreeAssessment =
  | PlanRunWorktreeKept
  | PlanRunWorktreeRemovable
  | PlanRunWorktreeTeardownFailed;

/** What {@link PlanRunWorktreeTeardownService.teardown} answers. */
export type PlanRunWorktreeTeardownResult =
  PlanRunWorktreeKept | PlanRunWorktreeRemoved | PlanRunWorktreeTeardownFailed;

/** What {@link runCommand} answers: the exit code instead of a throw. */
export interface CommandResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export interface CommandOptions {
  readonly cwd: string;
  readonly timeout: number;
}
