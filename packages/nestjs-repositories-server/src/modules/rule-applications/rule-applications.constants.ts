/**
 * @description Ledger states: applied (action performed), pre-satisfied (already satisfied on
 * first evaluation), flagged (blocked by executor gating), orphaned (rule un-matched after
 * applied; action never undone).
 * @public
 */
export const RULE_APPLICATION_STATES = {
  APPLIED: 'applied',
  FLAGGED: 'flagged',
  ORPHANED: 'orphaned',
  PRE_SATISFIED: 'pre-satisfied',
} as const;

/**
 * @description Status an orphaned injected task is soft-closed to (reversible). Exported so the
 * re-inject/revive path can recognize a task it previously soft-closed and reopen exactly that
 * state.
 * @public
 */
export const SOFT_CLOSED_TASK_STATUS = 'SKIPPED';
