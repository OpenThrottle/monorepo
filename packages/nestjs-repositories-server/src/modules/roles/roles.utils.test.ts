import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createRolesRepositoryMock } from './roles.utils.ts';

describe('createRolesRepositoryMock', () => {
  it('starts with no roles or grants', async () => {
    const repository = createRolesRepositoryMock();

    await expect(repository.findAll()).resolves.toEqual([]);
    await expect(repository.findByName('admin')).resolves.toBeNull();
    await expect(repository.findRoleNamesByUserId('u')).resolves.toEqual([]);
    await expect(repository.getPermissionsForUser('u')).resolves.toEqual([]);
    await expect(repository.getRoleToPermissionsMapping()).resolves.toEqual({});
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('answers false to every assignment against an empty table', async () => {
    const repository = createRolesRepositoryMock();

    await expect(repository.assignRoleToUser('u', 'r')).resolves.toBe(false);
    await expect(repository.removeRoleFromUser('u', 'r')).resolves.toBe(false);
    await expect(repository.assignRoleToServiceAccount('s', 'r')).resolves.toBe(
      false,
    );
    await expect(repository.addPermissionToRole('r', 'p')).resolves.toBe(false);
  });

  it('names the roles table in inherited not-found errors', async () => {
    const repository = createRolesRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'roles record with ID "a" not found',
    );
  });
});
