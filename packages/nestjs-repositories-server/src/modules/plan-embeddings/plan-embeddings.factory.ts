/**
 * @description Fishery factory for {@link PlanEmbedding}. Use in tests to build mock plan embeddings.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { plansFactory } from '../plans/plans.factory.ts';
import type { PlanEmbedding } from './plan-embedding.entity.ts';

/**
 * Factory for building PlanEmbedding-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ planId: '...' }) or .buildList(3, { content: '...' }).
 * @public
 */
export const planEmbeddingsFactory = Factory.define<PlanEmbedding>(() => ({
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
  plan: plansFactory.build(),
  planId: faker.string.uuid(),
}));
