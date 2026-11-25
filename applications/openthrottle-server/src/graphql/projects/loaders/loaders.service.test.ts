import type {
  PlansRepository,
  ProjectRepositoriesRepository,
  TasksRepository,
  UserFavoriteProjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlansRepositoryMock,
  createProjectRepositoriesRepositoryMock,
  createTasksRepositoryMock,
  createUserFavoriteProjectsRepositoryMock,
  repositoriesFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, test } from 'vitest';

import { ProjectsLoaders } from './loaders.service.ts';

describe('ProjectsLoaders', () => {
  test('repositoriesByProjectIdLoader batches into one grouped read and defaults to no repositories', async () => {
    const projectRepositories = createProjectRepositoriesRepositoryMock();
    const repository = repositoriesFactory.build();
    projectRepositories.listRepositoriesByProjectIds.mockResolvedValue(
      new Map([['p1', [repository]]]),
    );
    const loaders = new ProjectsLoaders(
      asMock<PlansRepository>(createPlansRepositoryMock()),
      asMock<ProjectRepositoriesRepository>(projectRepositories),
      asMock<TasksRepository>(createTasksRepositoryMock()),
      asMock<UserFavoriteProjectsRepository>(
        createUserFavoriteProjectsRepositoryMock(),
      ),
    );

    const [linked, unlinked] = await Promise.all([
      loaders.repositoriesByProjectIdLoader.load('p1'),
      loaders.repositoriesByProjectIdLoader.load('p2'),
    ]);

    expect(
      projectRepositories.listRepositoriesByProjectIds,
    ).toHaveBeenCalledTimes(1);
    expect(
      projectRepositories.listRepositoriesByProjectIds,
    ).toHaveBeenCalledWith(['p1', 'p2']);
    expect(linked).toEqual([repository]);
    expect(unlinked).toEqual([]);
  });

  test('favoriteProjectIdsByUserIdLoader reads each user once and returns their starred ids as a set', async () => {
    const favorites = createUserFavoriteProjectsRepositoryMock();
    favorites.listFavoriteProjectIds.mockResolvedValue(['p1', 'p2']);
    const loaders = new ProjectsLoaders(
      asMock<PlansRepository>(createPlansRepositoryMock()),
      asMock<ProjectRepositoriesRepository>(
        createProjectRepositoriesRepositoryMock(),
      ),
      asMock<TasksRepository>(createTasksRepositoryMock()),
      asMock<UserFavoriteProjectsRepository>(favorites),
    );

    const first = await loaders.favoriteProjectIdsByUserIdLoader.load('u1');
    await loaders.favoriteProjectIdsByUserIdLoader.load('u1');

    expect(favorites.listFavoriteProjectIds).toHaveBeenCalledTimes(1);
    expect(favorites.listFavoriteProjectIds).toHaveBeenCalledWith('u1');
    expect(first.has('p1')).toBe(true);
    expect(first.has('p3')).toBe(false);
  });
});
