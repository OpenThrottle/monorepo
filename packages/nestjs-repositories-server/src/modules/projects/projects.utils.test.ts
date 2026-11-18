import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createProjectsRepositoryMock } from './projects.utils.ts';

describe('createProjectsRepositoryMock', () => {
  it('starts with no projects', async () => {
    const repository = createProjectsRepositoryMock();

    await expect(repository.findAll()).resolves.toEqual([]);
    await expect(
      repository.findByNxProjectName('monorepo'),
    ).resolves.toBeNull();
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('names the projects table in inherited not-found errors', async () => {
    const repository = createProjectsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'projects record with ID "a" not found',
    );
  });
});
