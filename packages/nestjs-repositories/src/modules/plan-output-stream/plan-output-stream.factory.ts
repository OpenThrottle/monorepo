/**
 * @description Fishery factory for {@link PlanOutputStreamChunk}. Use in tests to build mock plan output stream chunks.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { plansFactory } from '../../modules/plans/plans.factory';
import type { PlanOutputStreamChunk } from './plan-output-stream.entity';

// /** Column-only shape for building plan output stream chunk test data (no relations). */
// export type PlanOutputStreamChunkFactoryData = Pick<
//   PlanOutputStreamChunk,
//   'id' | 'planId' | 'content' | 'iteration' | 'createdAt'
// >;

/**
 * Factory for building PlanOutputStreamChunk-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ planId: '...' }) or .buildList(3, { iteration: 1 }).
 */
export const planOutputStreamFactory = Factory.define<PlanOutputStreamChunk>(
  () => ({
    content: faker.lorem.paragraph(),
    createdAt: faker.date.past(),
    id: faker.string.uuid(),
    iteration: faker.number.int({ max: 10, min: 1 }),
    plan: plansFactory.build(),
    planId: faker.string.uuid(),
  }),
);
