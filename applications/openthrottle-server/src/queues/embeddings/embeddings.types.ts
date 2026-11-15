/**
 * @description Types for the embeddings queue (OT plan 165e86ef).
 */

import type { Job } from 'bullmq';

import type { EMBEDDABLE_ENTITIES } from './embeddings.constants.ts';

export type EmbeddableEntity = (typeof EMBEDDABLE_ENTITIES)[number];

export interface EmbedEntityJobData {
  readonly entity: EmbeddableEntity;
  readonly id: string;
}

export type EmbedEntityJob = Job<EmbedEntityJobData>;

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
  readonly whereSql: string;
}
