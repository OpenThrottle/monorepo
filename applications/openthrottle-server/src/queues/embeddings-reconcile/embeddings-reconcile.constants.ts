/**
 * @description Names and defaults for the embeddings reconciler (OT plan 165e86ef).
 */

export const EMBEDDINGS_RECONCILE_QUEUE_NAME = 'Embeddings Reconcile';

export const EMBEDDINGS_RECONCILE_JOB_NAME = 'Reconcile Embeddings';

/** @description Default minutes between cycles (`EMBEDDINGS_RECONCILE_INTERVAL_MINUTES`). */
export const DEFAULT_EMBEDDINGS_RECONCILE_INTERVAL_MINUTES = 15;

/** @description Default rows selected per query (`EMBEDDINGS_RECONCILE_BATCH_SIZE`). */
export const DEFAULT_EMBEDDINGS_RECONCILE_BATCH_SIZE = 100;

/** @description Lowest uuid: where each cycle's keyset walk starts. */
export const MIN_UUID = '00000000-0000-0000-0000-000000000000';
