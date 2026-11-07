/**
 * @description Values for the after-run worktree policy.
 */

/**
 * Finished reasons after which a run's worktree may be torn down: the plan's work is done and the
 * host finalize step pushed it. Everything else — handoff owed, failed, cancelled, usage limited,
 * max iterations, an already-terminal plan — keeps the worktree for a re-run or a human.
 */
export const PLAN_RUN_WORKTREE_TEARDOWN_REASONS: readonly string[] = [
  'workflow_complete',
  'workflow_tasks_exhausted',
];

/**
 * Why the policy declined to attempt a teardown.
 * - `NO_WORKTREE` — the run worked in the base checkout; there is nothing to remove.
 * - `REASON` — the run did not finish in a state that allows teardown.
 * - `NO_PR` — the run finished but opened no PR.
 * - `KEEP` — the plan's `ralph.worktreeCleanup` is `'keep'`.
 * - `PLAN_UNREADABLE` — the plan could not be read, so its choice is unknown.
 */
export const PLAN_RUN_WORKTREE_CLEANUP_SKIP = {
  KEEP: 'keep',
  NO_PR: 'no-pr',
  NO_WORKTREE: 'no-worktree',
  PLAN_UNREADABLE: 'plan-unreadable',
  REASON: 'reason',
} as const;
