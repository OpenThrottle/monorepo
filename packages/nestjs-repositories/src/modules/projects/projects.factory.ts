/**
 * @description Fishery factory for {@link Project}. Use in tests to build mock projects.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import type { ProjectData } from './project.entity';

// /** Column-only shape for building project test data (no relations). */
// export type ProjectFactoryData = Pick<
//   Project,
//   'id' | 'name' | 'description' | 'nxProjectName' | 'createdAt' | 'updatedAt'
// >;

/**
 * Factory for building Project-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ name: '...' }) or .buildList(3, { nxProjectName: 'my-app' }).
 */
export const projectsFactory = Factory.define<ProjectData>(() => ({
  createdAt: faker.date.past(),
  description: faker.lorem.sentence(),
  id: faker.string.uuid(),
  name: faker.lorem.words(3),
  nxProjectName: faker.helpers.arrayElement([
    null,
    'openthrottle-server',
    'cortex',
    'tools-workflows',
  ]),
  // plans: [],
  // tasks: [],
  updatedAt: faker.date.recent(),
}));
