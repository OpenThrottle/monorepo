/**
 * @description Fishery factory for {@link TaskEmbedding}. Use in tests to build mock task embeddings.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { tasksFactory } from '../tasks/tasks.factory.ts';
import type { TaskEmbedding } from './task-embedding.entity.ts';

/**
 * Factory for building TaskEmbedding-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ taskId: '...' }) or .buildList(3, { content: '...' }).
 * @public
 */
export const taskEmbeddingsFactory = Factory.define<TaskEmbedding>(() => ({
  content: faker.lorem.paragraph(),
  contentHash: faker.string.hexadecimal({
    casing: 'lower',
    length: 64,
    prefix: '',
  }),
  createdAt: faker.date.past(),
  embedding: Array.from({ length: 768 }, () => faker.number.float()),
  embeddingDims: 768,
  embeddingModel: 'nomic-embed-text-v1.5',
  id: faker.string.uuid(),
  metadata: {},
  task: tasksFactory.build(),
  taskId: faker.string.uuid(),
}));
