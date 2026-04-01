/**
 * @description Fishery factory for {@link PlanEmbedding}. Use in tests to build mock plan embeddings.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { plansFactory } from '../../modules/plans/plans.factory';
import type { PlanEmbedding } from './plan-embedding.entity';

/** Column-only shape for building plan embedding test data (no relations). */
// export type PlanEmbeddingFactoryData = Pick<
//   PlanEmbedding,
//   'id' | 'planId' | 'content' | 'embedding' | 'metadata' | 'createdAt'
// >;

/**
 * Factory for building PlanEmbedding-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ planId: '...' }) or .buildList(3, { content: '...' }).
 */
export const planEmbeddingsFactory = Factory.define<PlanEmbedding>(() => ({
  content: faker.lorem.paragraph(),
  createdAt: faker.date.past(),
  embedding: Array.from({ length: 1536 }, () => faker.number.float()),
  id: faker.string.uuid(),
  metadata: {},
  plan: plansFactory.build(),
  planId: faker.string.uuid(),
}));
