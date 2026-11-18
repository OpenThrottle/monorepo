import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';

import type { PlanEmbedding } from './plan-embedding.entity.ts';

/**
 * @description Row shape from raw SQL vector search (plan_embeddings JOIN plans). Aligns with {@link PlanEmbedding} id, content, metadata, plan_id plus plan_title and similarity from join/compute.
 * @public
 */
export interface PlanEmbeddingSearchRow {
  readonly content: string;
  readonly id: string;
  readonly metadata: unknown;
  readonly plan_id: string;
  readonly plan_title: string;
  readonly similarity: string;
}

/**
 * @description A `PlanEmbeddingsRepository` mock: every inherited `BaseRepository` method. The
 * repository adds none of its own.
 * @public
 */
export type PlanEmbeddingsRepositoryMock = BaseRepositoryMock<
  PlanEmbedding,
  CreateModelInput<PlanEmbedding>
>;
