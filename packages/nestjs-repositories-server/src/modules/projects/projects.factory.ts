/**
 * @description Fishery factory for {@link Project}. Use in tests to build mock projects.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { Project } from './project.entity.ts';

/**
 * Factory for building Project-shaped objects (plain data for mocks / tests): a live project
 * by default. Override any field via .build({ name: '...' }) or .buildList(3, { nxProjectName: 'my-app' }).
 * @public
 */
export const projectsFactory = Factory.define<Omit<Project, 'plans' | 'tasks'>>(
  () => ({
    createdAt: faker.date.past(),
    deletedAt: null,
    description: faker.lorem.sentence(),
    id: faker.string.uuid(),
    name: faker.lorem.words(3),
    nxProjectName: faker.helpers.arrayElement([
      null,
      'openthrottle-server',
      'openthrottle',
      'tools-workflows',
    ]),
    updatedAt: faker.date.recent(),
  }),
);
