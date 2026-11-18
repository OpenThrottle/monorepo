import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createServiceAccountsRepositoryMock } from './service-accounts.utils.ts';

describe('createServiceAccountsRepositoryMock', () => {
  it('starts with no service accounts', async () => {
    const repository = createServiceAccountsRepositoryMock();

    await expect(repository.findAll()).resolves.toEqual([]);
    await expect(repository.findByName('workflow-ralph')).resolves.toBeNull();
    await expect(repository.resolveActingUserId('a')).resolves.toBeNull();
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('rejects disable and enable like a missing account', async () => {
    const repository = createServiceAccountsRepositoryMock();

    await expect(repository.disable('a')).rejects.toThrow(NotFoundException);
    await expect(repository.enable('a')).rejects.toThrow(
      'service_accounts record with ID "a" not found',
    );
  });

  it('names the service_accounts table in inherited not-found errors', async () => {
    const repository = createServiceAccountsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(
      'service_accounts record with ID "a" not found',
    );
  });
});
