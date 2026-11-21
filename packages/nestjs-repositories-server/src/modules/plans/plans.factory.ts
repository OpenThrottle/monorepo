/**
 * @description Fishery factory for {@link Plan}. Use in tests to build mock plans.
 */

import { faker } from '@faker-js/faker';
import { getDefaultPlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { Factory } from 'fishery';

import type { Plan } from './plan.entity.ts';

/**
 * Factory for building Plan-shaped objects (plain data for mocks / tests): a live plan by
 * default.
 * Override any field via .build({ title: '...' }) or .buildList(3, { status: 'completed' }).
 * @public
 */
export const plansFactory = Factory.define<Plan>(() => ({
  assignee: null,
  author: faker.internet.username(),
  category: faker.helpers.arrayElement(['general', 'testing', 'docs']),
  completedAt: null,
  createdAt: faker.date.past(),
  deletedAt: null,
  description: faker.lorem.paragraph(),
  id: faker.string.uuid(),
  jobRunHooks: { hooks: [] },
  planEmbeddings: [],
  planOutputChunks: [],
  project: null,
  projectId: null,
  projectRelation: null,
  projectSortOrder: null,
  repositoryId: null,
  runConfig: getDefaultPlanRunConfigStorage(),
  status: faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  summary: null,
  tasks: [],
  title: faker.lorem.sentence(),
  updatedAt: faker.date.recent(),
}));
