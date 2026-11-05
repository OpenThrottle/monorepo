/**
 * @description Fishery factory for {@link PlanMessage}. Use in tests to build mock plan inbox messages.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { PlanMessage } from './plan-message.entity.ts';
import {
  PLAN_MESSAGE_KIND,
  PLAN_MESSAGE_STATUS,
} from './plan-messages.constants.ts';

/**
 * Builds a PENDING QUEUE message by default. Override any field via `.build({ kind: 'STEER' })`.
 * @public
 */
export const planMessageFactory = Factory.define<PlanMessage>(() => ({
  author: faker.internet.username(),
  body: faker.lorem.sentence(),
  createdAt: faker.date.past(),
  deliveredAt: null,
  deliveredToTaskId: null,
  id: faker.string.uuid(),
  kind: PLAN_MESSAGE_KIND.QUEUE,
  planId: faker.string.uuid(),
  planRunId: null,
  status: PLAN_MESSAGE_STATUS.PENDING,
  taskId: null,
  updatedAt: faker.date.recent(),
}));
