/**
 * @description The outcome values a plan-run worktree teardown or assessment reports.
 */

/**
 * - `REMOVED` — every guard passed and `pnpm run worktree:remove` succeeded. The branch is kept.
 * - `REMOVABLE` — every guard passed; returned only by an assessment, which removes nothing.
 * - `KEPT_NOT_PLAN_RUN_WORKTREE` — not a linked `plan-<8 hex>` worktree under the resolved root.
 * - `KEPT_PRIMARY` — the path is the base (primary) checkout.
 * - `KEPT_ACTIVE_RUN` — an unsettled (QUEUED / IN_PROGRESS) plan run points at its checkout.
 * - `KEPT_DIRTY` — `git status --porcelain` is not empty.
 * - `KEPT_UNPUSHED` — commits exist that neither the upstream nor the default branch contains.
 * - `FAILED` — a guard could not be evaluated, or the removal itself failed. The worktree is kept.
 */
export const PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME = {
  FAILED: 'failed',
  KEPT_ACTIVE_RUN: 'kept-active-run',
  KEPT_DIRTY: 'kept-dirty',
  KEPT_NOT_PLAN_RUN_WORKTREE: 'kept-not-plan-run-worktree',
  KEPT_PRIMARY: 'kept-primary',
  KEPT_UNPUSHED: 'kept-unpushed',
  REMOVABLE: 'removable',
  REMOVED: 'removed',
} as const;
