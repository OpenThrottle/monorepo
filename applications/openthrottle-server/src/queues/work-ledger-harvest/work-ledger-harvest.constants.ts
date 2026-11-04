export const WORK_LEDGER_HARVEST_QUEUE_NAME = 'Work Ledger Harvest';

/**
 * Max commits adopted per repo per sweep. A first pass over a repo with years of history is
 * bounded by this rather than by the API page cap, and the watermark means the next sweep picks
 * up where this one stopped — so a large backlog drains over several sweeps instead of one very
 * long run holding the worker.
 */
export const WORK_LEDGER_HARVEST_BATCH_SIZE = 500;
