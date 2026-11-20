import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createProjectRepositoriesRepositoryMock } from './project-repositories.utils.ts';

describe('createProjectRepositoriesRepositoryMock', () => {
  it('starts with no links', async () => {
    const repository = createProjectRepositoriesRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(
      repository.findByProjectAndRepository('p', 'r'),
    ).resolves.toBeNull();
    await expect(repository.unlink('p', 'r')).resolves.toBe(false);
    await expect(
      repository.listRepositoriesByProjectIds(['p']),
    ).resolves.toEqual(new Map());
    await expect(
      repository.listProjectsByRepositoryIds(['r']),
    ).resolves.toEqual(new Map());
    await expect(
      repository.syncLegacyProject('r', null, 'p'),
    ).resolves.toBeUndefined();
  });

  it('rejects link until a test stubs it', async () => {
    const repository = createProjectRepositoriesRepositoryMock();

    await expect(repository.link('p', 'r')).rejects.toThrow(/stub link/);
  });

  it('names the project_repositories table in inherited not-found errors', async () => {
    const repository = createProjectRepositoriesRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'project_repositories record with ID "a" not found',
    );
  });
});
