export const WORK_LEDGER_VERIFY_QUEUE_NAME = 'Work Ledger Verify';

/** Max artifacts examined per sweep (bounds GitHub API calls per run). */
export const WORK_LEDGER_VERIFY_BATCH_SIZE = 200;

/**
 * A git_commit whose sha GitHub still cannot find after this many hours is orphaned
 * (branch deleted / rebased away, and no squash mapping). Generous so a squash-merge (which
 * takes time to reconcile) or a slow push never causes a false orphan.
 */
export const WORK_LEDGER_VERIFY_ORPHAN_GRACE_HOURS = 24 * 7;
