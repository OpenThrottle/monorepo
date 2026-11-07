/**
 * @description Shapes for the plan-run worktree reaper: what it nominated and what came of it.
 */

import type {
  PlanRunWorktreeAssessment,
  PlanRunWorktreeTeardownResult,
} from '../plan-run-worktree-teardown/plan-run-worktree-teardown.types.ts';
import type { PLAN_RUN_WORKTREE_NOMINATION } from './plan-run-worktree-reaper.constants.ts';

export type PlanRunWorktreeNominationReason =
  (typeof PLAN_RUN_WORKTREE_NOMINATION)[keyof typeof PLAN_RUN_WORKTREE_NOMINATION];

/** A server-provisioned plan-run worktree found on disk, with the checkout it belongs to. */
export interface PlanRunWorktreeCandidate {
  readonly baseCheckoutPath: string;
  readonly branch: string | null;
  readonly name: string;
  readonly worktreePath: string;
}

export interface PlanRunWorktreeNominated {
  readonly kind: 'nominated';
  readonly reason: PlanRunWorktreeNominationReason;
}

export interface PlanRunWorktreeNotNominated {
  readonly detail: string;
  readonly kind: 'not-nominated';
}

export type PlanRunWorktreeNomination =
  PlanRunWorktreeNominated | PlanRunWorktreeNotNominated;

/** One nominee and the teardown service's answer: an assessment on a dry run, a teardown otherwise. */
export interface PlanRunWorktreeReaperEntry {
  readonly candidate: PlanRunWorktreeCandidate;
  readonly reason: PlanRunWorktreeNominationReason;
  readonly verdict: PlanRunWorktreeAssessment | PlanRunWorktreeTeardownResult;
}

export interface PlanRunWorktreeReaperSweepOptions {
  readonly dryRun: boolean;
  readonly now: Date;
}

export interface PlanRunWorktreeReaperSummary {
  /** Nominees left for the next tick because the per-tick removal cap was reached. */
  readonly deferred: number;
  readonly dryRun: boolean;
  /** Plan-run worktrees found on disk this tick. */
  readonly examined: number;
  /** Nominees handed to the teardown service, in order, with its answer. */
  readonly nominated: readonly PlanRunWorktreeReaperEntry[];
  /** Worktrees actually removed (always 0 on a dry run). */
  readonly removed: number;
}
