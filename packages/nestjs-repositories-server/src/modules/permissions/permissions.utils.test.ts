import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createPermissionsRepositoryMock } from './permissions.utils.ts';

describe('createPermissionsRepositoryMock', () => {
  it('starts with no permissions', async () => {
    const repository = createPermissionsRepositoryMock();

    await expect(repository.findAll()).resolves.toEqual([]);
    await expect(repository.findByName('users:read')).resolves.toBeNull();
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('names the permissions table in inherited not-found errors', async () => {
    const repository = createPermissionsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'permissions record with ID "a" not found',
    );
  });
});
