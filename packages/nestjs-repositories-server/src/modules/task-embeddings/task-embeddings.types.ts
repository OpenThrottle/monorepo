import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';

import type { TaskEmbedding } from './task-embedding.entity.ts';

/**
 * @description Row shape from raw SQL vector search (task_embeddings JOIN tasks JOIN plans). Aligns with {@link TaskEmbedding} id, content, metadata, task_id plus plan_id, plan_title, task_title and similarity from joins/compute.
 * @public
 */
export interface TaskEmbeddingSearchRow {
  readonly content: string;
  readonly id: string;
  readonly metadata: unknown;
  readonly plan_id: string;
  readonly plan_title: string;
  readonly similarity: string;
  readonly task_id: string;
  readonly task_title: string;
}

/**
 * @description A `TaskEmbeddingsRepository` mock: every inherited `BaseRepository` method. The
 * repository adds none of its own.
 * @public
 */
export type TaskEmbeddingsRepositoryMock = BaseRepositoryMock<
  TaskEmbedding,
  CreateModelInput<TaskEmbedding>
>;
