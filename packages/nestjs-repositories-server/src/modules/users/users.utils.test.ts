import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createUsersRepositoryMock } from './users.utils.ts';

describe('createUsersRepositoryMock', () => {
  it('starts with no users', async () => {
    const repository = createUsersRepositoryMock();

    await expect(repository.findAll()).resolves.toEqual([]);
    await expect(repository.findByEmail('a@b.com')).resolves.toBeNull();
    await expect(repository.findByGithubUsername('a')).resolves.toBeNull();
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('rejects disable and enable like a missing user', async () => {
    const repository = createUsersRepositoryMock();

    await expect(repository.disable('a')).rejects.toThrow(NotFoundException);
    await expect(repository.enable('a')).rejects.toThrow(
      'users record with ID "a" not found',
    );
  });

  it('names the users table in inherited not-found errors', async () => {
    const repository = createUsersRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(
      'users record with ID "a" not found',
    );
  });
});
