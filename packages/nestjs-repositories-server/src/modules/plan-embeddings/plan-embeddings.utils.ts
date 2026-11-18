import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';

import type { PlanEmbedding } from './plan-embedding.entity.ts';
import type { PlanEmbeddingsRepositoryMock } from './plan-embeddings.types.ts';

/**
 * @description Builds a {@link PlanEmbeddingsRepositoryMock} that starts as an empty
 * `plan_embeddings` table (see `createBaseRepositoryMock`). Provide it in place of
 * `PlanEmbeddingsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createPlanEmbeddingsRepositoryMock(): PlanEmbeddingsRepositoryMock {
  return createBaseRepositoryMock<
    PlanEmbedding,
    CreateModelInput<PlanEmbedding>
  >('plan_embeddings');
}
