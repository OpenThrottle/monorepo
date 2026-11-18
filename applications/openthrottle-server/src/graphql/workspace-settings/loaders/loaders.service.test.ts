import type { ProjectsRepository } from '@openthrottle/nestjs-repositories-server';
import {
  createProjectsRepositoryMock,
  projectsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { WorkspaceSettingsLoaders } from './loaders.service.ts';

describe('WorkspaceSettingsLoaders', () => {
  const projectsRepository = createProjectsRepositoryMock();
  const findProjects = projectsRepository.findBy;

  let loaders: WorkspaceSettingsLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    loaders = new WorkspaceSettingsLoaders(
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
});
