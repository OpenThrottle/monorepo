/**
 * @description Types for the embeddings section of server health (OT plan 165e86ef).
 */

import type { EmbeddableEntity } from '../../../queues/embeddings/embeddings.types.ts';

/**
 * @description `unconfigured`: the embedder cannot run (no weights, refused env, column
 * dimension mismatch) — search is lexical-only. `degraded`: it runs, but coverage is below the
 * threshold, the queue backlog is above it, or the provider is erroring. `ok` otherwise.
 */
export type EmbeddingsHealthStatus = 'degraded' | 'ok' | 'unconfigured';

export interface EmbeddingCoverage {
  /** Rows with an up-to-date vector from the configured model. */
  readonly embedded: number;
  readonly entity: EmbeddableEntity;
  /** Rows whose vector exists but is from another model or older text. */
  readonly stale: number;
  readonly table: string;
  /** Source rows that should have a vector (non-empty text, not soft-deleted or superseded). */
  readonly total: number;
}

export interface EmbeddingsHealthThresholds {
  readonly maxQueueBacklog: number;
  /** Fraction in [0, 1]; a table below it makes the status degraded. */
  readonly minCoverage: number;
}
