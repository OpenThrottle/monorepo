import { createMock } from '@golevelup/ts-vitest';
import type { ProjectsService } from '@openthrottle/nestjs-repositories';
import { type Project } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { WorkspaceSettingsLoaders } from './workspace-settings-loaders';

describe('WorkspaceSettingsLoaders', () => {
  const findProjects = vi.fn();
  const projectsService = createMock<ProjectsService>({
    getRepository: vi.fn().mockReturnValue({ find: findProjects }),
  });

  let loaders: WorkspaceSettingsLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    loaders = new WorkspaceSettingsLoaders(projectsService);
  });

  test('projectLoader batches many load() calls into one find and maps to key order', async () => {
    findProjects.mockResolvedValue([
      createMock<Project>({ id: 'p2', name: 'Two' }),
      createMock<Project>({ id: 'p1', name: 'One' }),
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
