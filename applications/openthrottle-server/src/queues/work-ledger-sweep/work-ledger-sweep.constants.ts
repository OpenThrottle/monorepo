export const WORK_LEDGER_SWEEP_QUEUE_NAME = 'Work Ledger Sweep';

/** A session still open past this many hours is considered abandoned and gets swept closed. */
export const WORK_LEDGER_SWEEP_TTL_HOURS = 24;

/** Max abandoned sessions closed per sweep. */
export const WORK_LEDGER_SWEEP_BATCH_SIZE = 500;
