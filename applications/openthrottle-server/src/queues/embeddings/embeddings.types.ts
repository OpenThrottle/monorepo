/**
 * @description Types for the embeddings queue (OT plan 165e86ef).
 */

import type { Job } from 'bullmq';

import type { EMBEDDABLE_ENTITIES } from './embeddings.constants.ts';

export type EmbeddableEntity = (typeof EMBEDDABLE_ENTITIES)[number];

export interface EmbedEntityJobData {
  /**
   * Set by the reconciler, so the job's completion counts toward the source's
   * `embeddings_backfill` activity (OT plan 5767e798). Absent on subscriber jobs and on payloads
   * enqueued before the field existed.
   */
  readonly backfill?: true;
  readonly entity: EmbeddableEntity;
  readonly id: string;
}

export type EmbedEntityJob = Job<EmbedEntityJobData>;

/**
 * @description Re-embed code chunks in place (OT plan e489d73d). A code chunk's text lives in
 * its own `code_embeddings` row, so the job carries the row ids and the processor embeds each
 * row's `content`. The code-index queue still decides which chunks exist.
 */
export interface EmbedCodeChunksJobData {
  readonly entity: 'code';
  readonly ids: readonly string[];
}

/** @description Everything the embeddings queue carries. */
export type EmbeddingsJobData = EmbedCodeChunksJobData | EmbedEntityJobData;

export type EmbeddingsJob = Job<EmbeddingsJobData>;

/**
 * @description What a job did: wrote a vector, found the stored one current, found nothing to
 * embed (row gone, soft-deleted or empty — any stale vector is removed), or re-delayed itself
 * because the embedder is unconfigured.
 */
export type EmbedEntityJobOutcome =
  'delayed' | 'embedded' | 'removed' | 'unchanged';

export interface EmbedEntityJobResult {
  readonly outcome: EmbedEntityJobOutcome;
}

/** @description SQL describing where an entity's embedded text comes from. */
export interface EmbeddingSource {
  readonly contentSql: string;
  readonly embeddingTable: string;
  readonly fkColumn: string;
  readonly fromSql: string;
  readonly pruneWhereSql: string;
  readonly whereSql: string;
}

/** @description The Embeddings worker's pace, from env (see `resolveEmbeddingsWorkerSettings`). */
export interface EmbeddingsWorkerSettings {
  readonly concurrency: number;
  /** BullMQ limiter, or undefined when `EMBEDDINGS_RATE_LIMIT_MAX=0` turns it off. */
  readonly limiter:
    { readonly duration: number; readonly max: number } | undefined;
}

/** @description What an `embeddings_backfill` activity tracks: an entity table or code chunks. */
export type EmbeddingBackfillSource = 'code' | EmbeddableEntity;
