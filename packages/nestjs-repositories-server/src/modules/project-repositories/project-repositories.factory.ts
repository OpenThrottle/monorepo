/**
 * @description Fishery factory for {@link ProjectRepository}. Use in tests to build mock
 * project-repository links.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { ProjectRepository } from './project-repository.entity.ts';

/**
 * Factory for building ProjectRepository-shaped objects (plain data for mocks / tests).
 * Override any field via .build({ projectId }).
 * @public
 */
export const projectRepositoriesFactory = Factory.define<
  Omit<ProjectRepository, 'project' | 'repository'>
>(() => {
  const createdAt = faker.date.past();
  return {
    createdAt,
    id: faker.string.uuid(),
    projectId: faker.string.uuid(),
    repositoryId: faker.string.uuid(),
    updatedAt: createdAt,
  };
});
