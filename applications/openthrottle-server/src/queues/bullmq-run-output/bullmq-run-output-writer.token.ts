/**
 * @description Optional `KeyedJsonlWriter` for per-queue/job Ralph transcript files.
 * Inject with `@Optional()`; resolves to `undefined` when `BULLMQ_RUN_OUTPUT_DIR` is unset.
 */
export const BULLMQ_RUN_OUTPUT_WRITER = 'BULLMQ_RUN_OUTPUT_WRITER' as const;
