import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';

import type { TaskEmbedding } from './task-embedding.entity.ts';
import type { TaskEmbeddingsRepositoryMock } from './task-embeddings.types.ts';

/**
 * @description Builds a {@link TaskEmbeddingsRepositoryMock} that starts as an empty
 * `task_embeddings` table (see `createBaseRepositoryMock`). Provide it in place of
 * `TaskEmbeddingsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createTaskEmbeddingsRepositoryMock(): TaskEmbeddingsRepositoryMock {
  return createBaseRepositoryMock<
    TaskEmbedding,
    CreateModelInput<TaskEmbedding>
  >('task_embeddings');
}
