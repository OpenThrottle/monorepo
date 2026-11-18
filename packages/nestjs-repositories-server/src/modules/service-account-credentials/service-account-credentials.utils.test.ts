import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createServiceAccountCredentialsRepositoryMock } from './service-account-credentials.utils.ts';

describe('createServiceAccountCredentialsRepositoryMock', () => {
  it('starts with no credentials', async () => {
    const repository = createServiceAccountCredentialsRepositoryMock();

    await expect(repository.findActiveCredentials('a')).resolves.toEqual([]);
    await expect(repository.findCredentials('a')).resolves.toEqual([]);
    await expect(repository.findCredentialById('a')).resolves.toBeNull();
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('verifies nothing and issues nothing', async () => {
    const repository = createServiceAccountCredentialsRepositoryMock();

    await expect(repository.verifyBearerToken('ot_sa_a_b')).resolves.toBeNull();
    await expect(
      repository.createCredential({ serviceAccountId: 'a' }),
    ).resolves.toBeNull();
    await expect(
      repository.upsertCredentialForToken({
        serviceAccountId: 'a',
        token: 'ot_sa_a_b',
      }),
    ).resolves.toBeNull();
    await expect(repository.revokeCredential('a')).resolves.toBe(false);
    await expect(repository.touchLastUsedAt('a')).resolves.toBe(false);
  });

  it('names the service_account_credentials table in inherited not-found errors', async () => {
    const repository = createServiceAccountCredentialsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'service_account_credentials record with ID "a" not found',
    );
  });
});
