import type {
  ProjectRepositoriesRepository,
  ProjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createProjectRepositoriesRepositoryMock,
  createProjectsRepositoryMock,
  projectsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { WorkspaceSettingsLoaders } from './loaders.service.ts';

describe('WorkspaceSettingsLoaders', () => {
  const projectsRepository = createProjectsRepositoryMock();
  const projectRepositories = createProjectRepositoriesRepositoryMock();
  const findProjects = projectsRepository.findBy;

  let loaders: WorkspaceSettingsLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    loaders = new WorkspaceSettingsLoaders(
      asMock<ProjectRepositoriesRepository>(projectRepositories),
      asMock<ProjectsRepository>(projectsRepository),
    );
  });

  test('projectLoader batches many load() calls into one find and maps to key order', async () => {
    findProjects.mockResolvedValue([
      {
        ...projectsFactory.build({ id: 'p2', name: 'Two' }),
        plans: [],
        tasks: [],
      },
      {
        ...projectsFactory.build({ id: 'p1', name: 'One' }),
        plans: [],
        tasks: [],
      },
    ]);

    const [a, b, missing] = await Promise.all([
      loaders.projectLoader.load('p1'),
      loaders.projectLoader.load('p2'),
      loaders.projectLoader.load('p3'),
    ]);

    expect(findProjects).toHaveBeenCalledTimes(1);
    expect(a?.id).toBe('p1');
    expect(b?.id).toBe('p2');
    expect(missing).toBeNull();
  });

  test('projectsByRepositoryIdLoader batches into one grouped read and defaults to no projects', async () => {
    const one = {
      ...projectsFactory.build({ id: 'p1' }),
      plans: [],
      tasks: [],
    };
    projectRepositories.listProjectsByRepositoryIds.mockResolvedValue(
      new Map([['r1', [one]]]),
    );

    const [linked, unlinked] = await Promise.all([
      loaders.projectsByRepositoryIdLoader.load('r1'),
      loaders.projectsByRepositoryIdLoader.load('r2'),
    ]);

    expect(
      projectRepositories.listProjectsByRepositoryIds,
    ).toHaveBeenCalledTimes(1);
    expect(
      projectRepositories.listProjectsByRepositoryIds,
    ).toHaveBeenCalledWith(['r1', 'r2']);
    expect(linked).toEqual([one]);
    expect(unlinked).toEqual([]);
  });
});
