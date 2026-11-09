import type { RUN_OUTPUT_SOURCE } from './bullmq-keyed-run-logging.constants.ts';
/** @description One of the {@link RUN_OUTPUT_SOURCE} layer tags. */
export type RunOutputSource =
  (typeof RUN_OUTPUT_SOURCE)[keyof typeof RUN_OUTPUT_SOURCE];
