/**
 * @description Constants for the background-activity registry (OT plan 5767e798).
 */

/** @description What kind of long-running work an activity is. `app_update` is the next one. */
export const BACKGROUND_ACTIVITY_KINDS = {
  embeddingsBackfill: 'embeddings_backfill',
} as const;

/**
 * @description `running` while progress keeps arriving; `stalled` once none has for
 * {@link BACKGROUND_ACTIVITY_STALLED_AFTER_MS} (an embedder that hangs, a worker that is busy
 * elsewhere).
 */
export const BACKGROUND_ACTIVITY_STATUSES = {
  running: 'running',
  stalled: 'stalled',
} as const;

/** @description Suffix under the checkout's queue prefix, so worktrees never see each other's. */
export const BACKGROUND_ACTIVITY_KEY_SUFFIX = 'background-activities';

/**
 * @description Every write refreshes this expiry, so an activity whose producer died (a killed
 * worker) disappears on its own instead of leaving a progress bar up forever. Longer than the
 * embeddings reconcile interval (15 min), which re-touches a live backlog every cycle.
 */
export const BACKGROUND_ACTIVITY_TTL_MS = 30 * 60_000;

/** @description No progress for this long reads as `stalled`. */
export const BACKGROUND_ACTIVITY_STALLED_AFTER_MS = 5 * 60_000;

/** @description Progress samples kept per activity for the throughput estimate. */
export const BACKGROUND_ACTIVITY_MAX_SAMPLES = 20;

/**
 * @description Samples closer together than this are merged into one interval before smoothing,
 * so concurrent workers reporting a millisecond apart cannot read as a huge spike in throughput.
 */
export const BACKGROUND_ACTIVITY_MIN_INTERVAL_MS = 5_000;

/** @description Intervals needed before an ETA is offered; fewer is not enough signal. */
export const BACKGROUND_ACTIVITY_MIN_INTERVALS = 2;

/** @description EWMA weight of the newest interval's throughput. */
export const BACKGROUND_ACTIVITY_RATE_ALPHA = 0.3;
