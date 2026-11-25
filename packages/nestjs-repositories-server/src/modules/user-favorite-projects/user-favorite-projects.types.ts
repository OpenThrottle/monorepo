import type { Mock } from 'vitest';

import type { UserFavoriteProject } from './user-favorite-project.entity.ts';
import type { UserFavoriteProjectsRepository } from './user-favorite-projects.repository.ts';

/**
 * Scalar/column fields of {@link UserFavoriteProject} (no relations).
 * @public
 */
export type UserFavoriteProjectData = Pick<
  UserFavoriteProject,
  'createdAt' | 'projectId' | 'userId'
>;

/**
 * @description A {@link UserFavoriteProjectsRepository} mock.
 * @public
 */
export interface UserFavoriteProjectsRepositoryMock {
  readonly listFavoriteProjectIds: Mock<
    UserFavoriteProjectsRepository['listFavoriteProjectIds']
  >;
  readonly setProjectFavorite: Mock<
    UserFavoriteProjectsRepository['setProjectFavorite']
  >;
}
