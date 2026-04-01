/**
 * @description Fishery factory for {@link TaskEmbedding}. Use in tests to build mock task embeddings.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { tasksFactory } from '../../modules/tasks/tasks.factory';
import type { TaskEmbedding } from './task-embedding.entity';

// /** Column-only shape for building task embedding test data (no relations). */
// export type TaskEmbeddingFactoryData = Pick<
//   TaskEmbedding,
//   'id' | 'taskId' | 'content' | 'embedding' | 'metadata' | 'createdAt'
// >;

/**
 * Factory for building TaskEmbedding-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ taskId: '...' }) or .buildList(3, { content: '...' }).
 */
export const taskEmbeddingsFactory = Factory.define<TaskEmbedding>(() => ({
  content: faker.lorem.paragraph(),
  createdAt: faker.date.past(),
  embedding: Array.from({ length: 1536 }, () => faker.number.float()),
  id: faker.string.uuid(),
  metadata: {},
  task: tasksFactory.build(),
  taskId: faker.string.uuid(),
}));
