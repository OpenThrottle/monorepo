import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createRepositoryCheckoutsRepositoryMock } from './repository-checkouts.utils.ts';

describe('createRepositoryCheckoutsRepositoryMock', () => {
  it('starts with no checkouts', async () => {
    const repository = createRepositoryCheckoutsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
    await expect(repository.listByUserId('u')).resolves.toEqual([]);
    await expect(repository.findAll()).resolves.toEqual([]);
    await expect(repository.findCheckoutById('c')).resolves.toBeNull();
    await expect(repository.findByIdForUser('c', 'u')).resolves.toBeNull();
    await expect(repository.findByUserAndPath('u', '/p')).resolves.toBeNull();
    await expect(repository.countByRepositoryId('r')).resolves.toBe(0);
  });

  it('reports nothing updated or removed', async () => {
    const repository = createRepositoryCheckoutsRepositoryMock();

    await expect(repository.removeForUser('u', 'c')).resolves.toBe(false);
    await expect(repository.deleteWorktreeCheckout('u', 'c')).resolves.toBe(
      false,
    );
    await expect(
      repository.setForeignSkillInjectionEnabledForRepository('u', 'r', true),
    ).resolves.toBe(0);
    await expect(
      repository.updateDisplayName('u', 'c', 'name'),
    ).resolves.toBeNull();
  });

  it('rejects the create paths until they are stubbed', async () => {
    const repository = createRepositoryCheckoutsRepositoryMock();

    await expect(
      repository.createForUser('u', {
        displayName: 'n',
        filesystemPath: '/p',
        repositoryId: 'r',
      }),
    ).rejects.toThrow('stub createForUser');
    await expect(
      repository.upsertWorktreeCheckout('u', {
        displayName: 'n',
        filesystemPath: '/p',
        repositoryId: 'r',
      }),
    ).rejects.toThrow('stub upsertWorktreeCheckout');
  });

  it('names the repository_checkouts table in inherited not-found errors', async () => {
    const repository = createRepositoryCheckoutsRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'repository_checkouts record with ID "a" not found',
    );
  });
});
