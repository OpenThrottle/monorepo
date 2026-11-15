/**
 * @description Types for the embeddings reconciler (OT plan 165e86ef).
 */

import type { Job } from 'bullmq';

import type { EmbeddableEntity } from '../embeddings/embeddings.types.ts';

export type EmbeddingsReconcileJob = Job<Record<string, never>>;

export interface EmbeddingsReconcileConfig {
  readonly batchSize: number;
  readonly intervalMinutes: number;
}

export interface EmbeddingsReconcileEntitySummary {
  /** Rows found missing or stale and handed to the embeddings queue. */
  readonly enqueued: number;
  /** Embedding rows whose source is gone, soft-deleted or superseded, deleted this cycle. */
  readonly pruned: number;
}

export type EmbeddingsReconcileSummary =
  | {
      /** Code chunks re-embedded from their own content (OT plan e489d73d); never pruned. */
      readonly code: EmbeddingsReconcileEntitySummary;
      readonly entities: Readonly<
        Record<EmbeddableEntity, EmbeddingsReconcileEntitySummary>
      >;
      readonly skipped: false;
    }
  | { readonly reason: string; readonly skipped: true };
