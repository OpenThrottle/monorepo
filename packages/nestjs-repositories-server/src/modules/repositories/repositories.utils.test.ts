import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createRepositoriesRepositoryMock } from './repositories.utils.ts';

describe('createRepositoriesRepositoryMock', () => {
  it('starts with no repositories', async () => {
    const repository = createRepositoriesRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
    await expect(repository.findRepositoryById('a')).resolves.toBeNull();
    await expect(
      repository.findByNormalizedRemoteUrl('https://github.com/o/r'),
    ).resolves.toBeNull();
  });

  it('reports a missing repository for the merge, update and delete paths', async () => {
    const repository = createRepositoriesRepositoryMock();

    await expect(
      repository.mergeDetectedRemote('a', 'https://github.com/o/r'),
    ).resolves.toBeNull();
    await expect(repository.updateRepository('a', {})).resolves.toBeNull();
    await expect(repository.removeRepository('a')).resolves.toBe(false);
  });

  it('rejects findOrCreateByRemoteUrl until it is stubbed', async () => {
    const repository = createRepositoriesRepositoryMock();

    await expect(
      repository.findOrCreateByRemoteUrl(null, {
        defaultBranch: null,
        name: 'n',
        projectId: null,
      }),
    ).rejects.toThrow('stub findOrCreateByRemoteUrl');
  });

  it('names the repositories table in inherited not-found errors', async () => {
    const repository = createRepositoriesRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'repositories record with ID "a" not found',
    );
  });
});
