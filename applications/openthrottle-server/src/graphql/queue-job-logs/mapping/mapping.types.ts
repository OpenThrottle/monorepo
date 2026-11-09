import type { QUEUE_JOB_LOG_LEVELS } from './mapping.constants.ts';
export type QueueJobLogLevel = (typeof QUEUE_JOB_LOG_LEVELS)[number];

/**
 * @description Minimal record shape this module reads — structurally satisfied by
 * `KeyedJsonlRunRecord` from `@openthrottle/nestjs-logging`.
 */
export interface QueueJobLogSourceRecord {
  readonly data: string | Readonly<Record<string, unknown>>;
  readonly type: string;
}
