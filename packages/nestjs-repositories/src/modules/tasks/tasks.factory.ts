/**
 * @description Fishery factory for {@link Task}. Use in tests to build mock tasks.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { plansFactory } from '../../modules/plans/plans.factory';
import type { Task } from './task.entity';

/** Column-only shape for building task test data (no relations). */
// export type TaskFactoryData = Pick<
//   Task,
//   | 'id'
//   | 'planId'
//   | 'title'
//   | 'description'
//   | 'category'
//   | 'status'
//   | 'requirements'
//   | 'assignee'
//   | 'summary'
//   | 'project'
//   | 'projectId'
//   | 'createdAt'
//   | 'updatedAt'
// >;

/**
 * Factory for building Task-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ planId: '...' }) or .buildList(3, { status: 'completed' }).
 */
export const tasksFactory = Factory.define<Task>(() => ({
  assignee: null,
  category: faker.helpers.arrayElement(['general', 'testing']),
  completedAt: null,
  createdAt: faker.date.past(),
  description: faker.lorem.paragraph(),
  hookChildren: [],
  hookRole: null,
  hookScope: null,
  hookSource: null,
  id: faker.string.uuid(),
  parentTask: null,
  parentTaskId: null,
  plan: plansFactory.build(),
  planId: faker.string.uuid(),
  project: null,
  projectId: null,
  projectRelation: null,
  requirements: [],
  skillSlug: null,
  sortOrder: faker.number.int({ max: 10_000, min: 1000, multipleOf: 1000 }),
  status: faker.helpers.arrayElement([
    'BLOCKED',
    'COMPLETED',
    'IN_PROGRESS',
    'PENDING',
  ]),
  summary: null,
  taskEmbeddings: [],
  title: faker.lorem.sentence(),
  updatedAt: faker.date.recent(),
}));
