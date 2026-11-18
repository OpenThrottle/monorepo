/**
 * @description Fishery factory for {@link PlanOutputStreamChunk}. Use in tests to build mock plan output stream chunks.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { plansFactory } from '../plans/plans.factory.ts';
import type { PlanOutputStreamChunk } from './plan-output-stream-chunk.entity.ts';

/**
 * Factory for building PlanOutputStreamChunk-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ planId: '...' }) or .buildList(3, { iteration: 1 }).
 * @public
 */
export const planOutputStreamFactory = Factory.define<PlanOutputStreamChunk>(
  () => ({
    content: faker.lorem.paragraph(),
    createdAt: faker.date.past(),
    id: faker.string.uuid(),
    iteration: faker.number.int({ max: 10, min: 1 }),
    kind: null,
    plan: plansFactory.build(),
    planId: faker.string.uuid(),
    taskId: null,
  }),
);
