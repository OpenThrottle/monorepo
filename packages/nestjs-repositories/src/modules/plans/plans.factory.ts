/**
 * @description Fishery factory for {@link Plan}. Use in tests to build mock plans.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { getDefaultPlanRunConfigStorage } from './plan-run-config';
import type { Plan } from './plan.entity';

// /** Column-only shape for building plan test data (no relations). */
// export type PlanFactoryData = Pick<
//   Plan,
//   | 'id'
//   | 'title'
//   | 'author'
//   | 'category'
//   | 'description'
//   | 'status'
//   | 'assignee'
//   | 'summary'
//   | 'project'
//   | 'projectId'
//   | 'createdAt'
//   | 'updatedAt'
// >;

/**
 * Factory for building Plan-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ title: '...' }) or .buildList(3, { status: 'completed' }).
 */
export const plansFactory = Factory.define<Plan>(() => ({
  assignee: null,
  author: faker.internet.username(),
  category: faker.helpers.arrayElement(['general', 'testing', 'docs']),
  commitLinks: [],
  createdAt: faker.date.past(),
  description: faker.lorem.paragraph(),
  id: faker.string.uuid(),
  jobRunHooks: { hooks: [] },
  planEmbeddings: [],
  planOutputChunks: [],
  project: null,
  projectId: null,
  projectRelation: null,
  runConfig: getDefaultPlanRunConfigStorage(),
  status: faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  summary: null,
  tasks: [],
  title: faker.lorem.sentence(),
  updatedAt: faker.date.recent(),
}));
