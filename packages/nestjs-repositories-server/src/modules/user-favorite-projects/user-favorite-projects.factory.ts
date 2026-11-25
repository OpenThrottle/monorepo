/**
 * @description Fishery factory for {@link UserFavoriteProject}. Use in tests to build mock
 * favorite rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { UserFavoriteProjectData } from './user-favorite-projects.types.ts';

/**
 * @description Builds UserFavoriteProject-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const userFavoriteProjectsFactory =
  Factory.define<UserFavoriteProjectData>(() => {
    return {
      createdAt: faker.date.past(),
      projectId: faker.string.uuid(),
      userId: faker.string.uuid(),
    };
  });
