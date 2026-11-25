import type { CodeIndexJob } from '../../queues/code-index/code-index.types.ts';
import type { CODE_INDEX_STATUS } from './code-search.constants.ts';

export type CodeIndexStatus =
  (typeof CODE_INDEX_STATUS)[keyof typeof CODE_INDEX_STATUS];

/** A repository's code-index job as codeIndexStatus reads it. */
export interface CodeIndexJobState {
  /** BullMQ's failure message; null unless the job failed. */
  readonly failedReason: string | null;
  readonly job: CodeIndexJob;
  /** BullMQ job state (`active`, `waiting`, `failed`, ...). */
  readonly state: string;
}
