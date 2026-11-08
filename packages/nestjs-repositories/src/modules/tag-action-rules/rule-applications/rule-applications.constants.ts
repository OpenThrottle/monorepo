/**
 * @description Status an orphaned injected task is soft-closed to (reversible).
 * Exported so the re-inject/revive path can recognize a task it previously
 * soft-closed and reopen exactly that state.
 * @public
 */
export const SOFT_CLOSED_TASK_STATUS = 'SKIPPED';
