/**
 * @description Optional `KeyedJsonlWriter` for per-queue/job plan-run transcript files.
 * Inject with `@Optional()`; resolves to `undefined` when `BULLMQ_RUN_OUTPUT_DIR` is unset.
 */
export const BULLMQ_RUN_OUTPUT_WRITER = 'BULLMQ_RUN_OUTPUT_WRITER' as const;
