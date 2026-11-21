import type {
  PlansRepository,
  ProjectRepositoriesRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlansRepositoryMock,
  createProjectRepositoriesRepositoryMock,
  createTasksRepositoryMock,
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
});
