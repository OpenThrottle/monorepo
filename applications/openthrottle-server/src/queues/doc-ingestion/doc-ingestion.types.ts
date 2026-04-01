/**
 * @description Types for the doc-ingestion BullMQ job. Payload matches DocIngestionJobPayload from @tools/workflows/doc-ingestion.
 */

import type { Job } from 'bullmq';

export interface DocIngestionJobPayload {
  readonly directories?: readonly string[];
  readonly files?: readonly string[];
  readonly repo?: string;
  readonly scope?: string;
  readonly sha?: string;
}

/**
 * @description Return value of the doc-ingestion job for API/UI display.
 */
export interface DocIngestionJobResult {
  readonly deindexedCount: number;
  readonly ingestedCount: number;
  readonly toAddCount: number;
  readonly toRemoveCount: number;
  readonly toUpdateCount: number;
}

/** BullMQ job type for doc-ingestion queue. */
export type DocIngestionJob = Job<
  DocIngestionJobPayload,
  DocIngestionJobResult
>;
