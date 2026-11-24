import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ServiceAccount } from '../service-accounts/service-account.entity.ts';
import { serviceAccountsFactory } from '../service-accounts/service-accounts.factory.ts';
import { hashSecret, validateSecret } from './secret/secret.utils.ts';
import { ServiceAccountCredential } from './service-account-credential.entity.ts';
import { serviceAccountCredentialsFactory } from './service-account-credentials.factory.ts';
import { ServiceAccountCredentialsRepository } from './service-account-credentials.repository.ts';
import { SERVICE_ACCOUNT_BEARER_PREFIX } from './token/token.constants.ts';
import { parseServiceAccountToken } from './token/token.utils.ts';

const serviceAccountId = '11111111-1111-4111-8111-111111111111';
const credentialId = '22222222-2222-4222-8222-222222222222';
const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');
const TEST_ROUNDS = 4;
const SECRET = 'validSecret0123456789abcdefABCDEF';
const SHORT_SECRET = 'validSecret12';

/** A credential as `verifyBearerToken` loads it: the account is null once soft deleted. */
interface LoadedCredential extends Omit<
  ServiceAccountCredential,
  'serviceAccount'
> {
  serviceAccount: ServiceAccount | null;
}

describe('ServiceAccountCredentialsRepository', () => {
  const create = vi.fn();
  const find = vi.fn();
  const findOne = vi.fn();
  const save = vi.fn();
  const update = vi.fn();
  const accountFindOne = vi.fn();
  let repository: ServiceAccountCredentialsRepository;

  const enabledAccount = serviceAccountsFactory.build({
    disabledAt: null,
    id: serviceAccountId,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((data: Partial<ServiceAccountCredential>) => {
      return data;
    });
    save.mockImplementation(async (entity: ServiceAccountCredential) => {
      return { ...entity, createdAt: new Date(FIXED_NOW), id: credentialId };
    });
    update.mockResolvedValue({ affected: 1 });
    find.mockResolvedValue([]);

    const app = await Test.createTestingModule({
      providers: [
        ServiceAccountCredentialsRepository,
        {
          provide: getRepositoryToken(ServiceAccountCredential),
          useValue: createMock<Repository<ServiceAccountCredential>>({
            create,
            find,
            findOne,
            save,
            target: ServiceAccountCredential,
            update,
          }),
        },
        {
          provide: getRepositoryToken(ServiceAccount),
          useValue: createMock<Repository<ServiceAccount>>({
            findOne: accountFindOne,
          }),
        },
      ],
    }).compile();

    repository = app.get<ServiceAccountCredentialsRepository>(
      ServiceAccountCredentialsRepository,
    );
  });

  describe('createCredential', () => {
    it('returns null when service account is missing', async () => {
      accountFindOne.mockResolvedValue(null);

      await expect(
        repository.createCredential({ serviceAccountId }),
      ).resolves.toBeNull();
    });

    it('returns null when service account is disabled', async () => {
      accountFindOne.mockResolvedValue(
        serviceAccountsFactory.build({
          disabledAt: new Date(FIXED_NOW),
          id: serviceAccountId,
        }),
      );

      await expect(
        repository.createCredential({ serviceAccountId }),
      ).resolves.toBeNull();
    });

    it('returns ot_sa token and saves a SHA-256 hash', async () => {
      accountFindOne.mockResolvedValue(enabledAccount);

      const result = await repository.createCredential({
        label: 'mcp',
        serviceAccountId,
      });

      expect(result).not.toBeNull();
      expect(result?.token).toMatch(
        new RegExp(
          `^${SERVICE_ACCOUNT_BEARER_PREFIX}[a-zA-Z0-9]{12}_[a-zA-Z0-9]{32}$`,
        ),
      );
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: null,
          label: 'mcp',
          prefix: expect.any(String),
          secretHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          serviceAccountId,
        }),
        undefined,
      );
    });

    it('hashes the secret shown in the token', async () => {
      accountFindOne.mockResolvedValue(enabledAccount);

      const result = await repository.createCredential({ serviceAccountId });
      const secret =
        parseServiceAccountToken(result?.token ?? '')?.secret ?? '';

      await expect(
        validateSecret(secret, result?.credential.secretHash),
      ).resolves.toBe(true);
    });
  });

  describe('upsertCredentialForToken', () => {
    const prefix = 'knownprefix1';
    const secret = SECRET;
    const token = `${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_${secret}`;
    const shortToken = `${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_${SHORT_SECRET}`;

    it('returns null when the service account is missing', async () => {
      accountFindOne.mockResolvedValue(null);

      await expect(
        repository.upsertCredentialForToken({ serviceAccountId, token }),
      ).resolves.toBeNull();
      expect(save).not.toHaveBeenCalled();
    });

    it('returns null when the service account is disabled', async () => {
      accountFindOne.mockResolvedValue(
        serviceAccountsFactory.build({
          disabledAt: new Date(FIXED_NOW),
          id: serviceAccountId,
        }),
      );

      await expect(
        repository.upsertCredentialForToken({ serviceAccountId, token }),
      ).resolves.toBeNull();
    });

    it('throws when the token is not an ot_sa_<prefix>_<secret> token', async () => {
      accountFindOne.mockResolvedValue(enabledAccount);

      await expect(
        repository.upsertCredentialForToken({
          serviceAccountId,
          token: 'deadbeefdeadbeefdeadbeefdeadbeef',
        }),
      ).rejects.toThrow(/ot_sa_<prefix>_<secret>/);
    });

    it('creates a credential whose stored hash verifies the token', async () => {
      accountFindOne.mockResolvedValue(enabledAccount);
      findOne.mockResolvedValue(null);

      const result = await repository.upsertCredentialForToken({
        label: 'mcp',
        serviceAccountId,
        token,
      });

      expect(result?.action).toBe('created');
      const saved = save.mock.calls[0]?.[0];
      expect(saved).toEqual(
        expect.objectContaining({
          label: 'mcp',
          prefix,
          secretHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          serviceAccountId,
        }),
      );
      await expect(validateSecret(secret, saved?.secretHash)).resolves.toBe(
        true,
      );
    });

    it('is a no-op when a non-revoked credential already matches the token', async () => {
      accountFindOne.mockResolvedValue(enabledAccount);
      findOne.mockResolvedValue(
        serviceAccountCredentialsFactory.build({
          prefix,
          revokedAt: null,
          secretHash: hashSecret(secret),
          serviceAccountId,
        }),
      );

      const result = await repository.upsertCredentialForToken({
        serviceAccountId,
        token,
      });

      expect(result?.action).toBe('noop');
      expect(save).not.toHaveBeenCalled();
    });

    it('throws rather than store a secret shorter than the minimum', async () => {
      accountFindOne.mockResolvedValue(enabledAccount);
      findOne.mockResolvedValue(null);

      await expect(
        repository.upsertCredentialForToken({
          serviceAccountId,
          token: shortToken,
        }),
      ).rejects.toThrow(/at least 32/);
      expect(save).not.toHaveBeenCalled();
    });

    it('is a no-op for a short secret that already verifies against a legacy hash', async () => {
      accountFindOne.mockResolvedValue(enabledAccount);
      findOne.mockResolvedValue(
        serviceAccountCredentialsFactory.build({
          prefix,
          revokedAt: null,
          secretHash: await bcrypt.hash(SHORT_SECRET, TEST_ROUNDS),
          serviceAccountId,
        }),
      );

      const result = await repository.upsertCredentialForToken({
        serviceAccountId,
        token: shortToken,
      });

      expect(result?.action).toBe('noop');
      expect(save).not.toHaveBeenCalled();
    });

    it('rehashes and un-revokes in place when an existing credential is stale', async () => {
      accountFindOne.mockResolvedValue(enabledAccount);
      const existing = serviceAccountCredentialsFactory.build({
        prefix,
        revokedAt: new Date(FIXED_NOW),
        secretHash: hashSecret('a-different-secret'),
        serviceAccountId,
      });
      findOne.mockResolvedValue(existing);

      const result = await repository.upsertCredentialForToken({
        serviceAccountId,
        token,
      });

      expect(result?.action).toBe('updated');
      expect(existing.revokedAt).toBeNull();
      await expect(validateSecret(secret, existing.secretHash)).resolves.toBe(
        true,
      );
      expect(save).toHaveBeenCalledWith(existing);
    });

    it('throws when the prefix belongs to a different service account', async () => {
      accountFindOne.mockResolvedValue(enabledAccount);
      findOne.mockResolvedValue(
        serviceAccountCredentialsFactory.build({
          prefix,
          serviceAccountId: '99999999-9999-4999-8999-999999999999',
        }),
      );

      await expect(
        repository.upsertCredentialForToken({ serviceAccountId, token }),
      ).rejects.toThrow(/different service account/);
    });
  });

  describe('verifyBearerToken', () => {
    const secret = SECRET;
    const prefix = 'knownprefix1';
    const bearer = `Bearer ${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_${secret}`;

    const credentialWith = async (
      overrides: Partial<LoadedCredential>,
    ): Promise<LoadedCredential> => {
      return {
        ...serviceAccountCredentialsFactory.build({
          id: credentialId,
          prefix,
          secretHash: hashSecret(secret),
          serviceAccountId,
        }),
        serviceAccount: enabledAccount,
        ...overrides,
      };
    };

    it('returns null for JWT-shaped bearer', async () => {
      await expect(
        repository.verifyBearerToken('Bearer eyJhbGciOiJIUzI1NiJ9'),
      ).resolves.toBeNull();
      expect(findOne).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    it('returns null when prefix is unknown', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        repository.verifyBearerToken(
          `${SERVICE_ACCOUNT_BEARER_PREFIX}unknown_secretpart`,
        ),
      ).resolves.toBeNull();
      expect(update).not.toHaveBeenCalled();
    });

    it('returns null when secret does not match hash', async () => {
      findOne.mockResolvedValue(await credentialWith({}));

      await expect(
        repository.verifyBearerToken(
          `${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_wrongsecret`,
        ),
      ).resolves.toBeNull();
    });

    it('returns null when credential is revoked', async () => {
      findOne.mockResolvedValue(
        await credentialWith({ revokedAt: new Date(FIXED_NOW) }),
      );

      await expect(repository.verifyBearerToken(bearer)).resolves.toBeNull();
    });

    it('returns null when credential is expired', async () => {
      findOne.mockResolvedValue(
        await credentialWith({ expiresAt: new Date(FIXED_NOW) }),
      );

      await expect(repository.verifyBearerToken(bearer)).resolves.toBeNull();
    });

    it('returns null when the service account is disabled', async () => {
      findOne.mockResolvedValue(
        await credentialWith({
          serviceAccount: serviceAccountsFactory.build({
            disabledAt: new Date(FIXED_NOW),
          }),
        }),
      );

      await expect(repository.verifyBearerToken(bearer)).resolves.toBeNull();
      expect(update).not.toHaveBeenCalled();
    });

    it('returns null when the service account is soft deleted', async () => {
      // The relation reads live rows only, so a soft-deleted account loads as null.
      findOne.mockResolvedValue(await credentialWith({ serviceAccount: null }));

      await expect(repository.verifyBearerToken(bearer)).resolves.toBeNull();
      expect(update).not.toHaveBeenCalled();
    });

    it('returns principal and touches last_used_at on success', async () => {
      findOne.mockResolvedValue(await credentialWith({}));

      await expect(repository.verifyBearerToken(bearer)).resolves.toEqual({
        credentialId,
        serviceAccountId,
      });
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ id: credentialId }),
        { lastUsedAt: expect.any(Date) },
      );
    });

    it('isActiveToken agrees with verifyBearerToken and never writes', async () => {
      findOne.mockResolvedValue(await credentialWith({}));
      await expect(repository.isActiveToken(bearer)).resolves.toBe(true);

      findOne.mockResolvedValue(
        await credentialWith({ revokedAt: new Date(FIXED_NOW) }),
      );
      await expect(repository.isActiveToken(bearer)).resolves.toBe(false);
      expect(update).not.toHaveBeenCalled();
    });

    describe('when the stored hash is a legacy bcrypt hash', () => {
      it('verifies and rewrites it to SHA-256 in place', async () => {
        findOne.mockResolvedValue(
          await credentialWith({
            secretHash: await bcrypt.hash(secret, TEST_ROUNDS),
          }),
        );

        await expect(repository.verifyBearerToken(bearer)).resolves.toEqual({
          credentialId,
          serviceAccountId,
        });
        expect(update).toHaveBeenCalledWith(
          expect.objectContaining({ id: credentialId }),
          { lastUsedAt: expect.any(Date), secretHash: hashSecret(secret) },
        );
      });

      it('keeps the bcrypt hash for a secret shorter than the minimum', async () => {
        findOne.mockResolvedValue(
          await credentialWith({
            secretHash: await bcrypt.hash(SHORT_SECRET, TEST_ROUNDS),
          }),
        );

        await expect(
          repository.verifyBearerToken(
            `${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_${SHORT_SECRET}`,
          ),
        ).resolves.toEqual({ credentialId, serviceAccountId });
        expect(update).toHaveBeenCalledWith(
          expect.objectContaining({ id: credentialId }),
          { lastUsedAt: expect.any(Date) },
        );
      });

      it('does not rewrite it when the secret is wrong', async () => {
        findOne.mockResolvedValue(
          await credentialWith({
            secretHash: await bcrypt.hash(secret, TEST_ROUNDS),
          }),
        );

        await expect(
          repository.verifyBearerToken(
            `${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_wrongsecret`,
          ),
        ).resolves.toBeNull();
        expect(update).not.toHaveBeenCalled();
      });
    });
  });

  describe('revokeCredential', () => {
    it('returns false when credential is missing', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.revokeCredential(credentialId)).resolves.toBe(
        false,
      );
    });

    it('returns false when credential is already revoked', async () => {
      findOne.mockResolvedValue(
        serviceAccountCredentialsFactory.build({ revokedAt: FIXED_NOW }),
      );

      await expect(repository.revokeCredential(credentialId)).resolves.toBe(
        false,
      );
      expect(save).not.toHaveBeenCalled();
    });

    it('sets revoked_at when credential is active', async () => {
      const credential = serviceAccountCredentialsFactory.build({
        revokedAt: null,
      });
      findOne.mockResolvedValue(credential);

      await expect(repository.revokeCredential(credentialId)).resolves.toBe(
        true,
      );
      expect(credential.revokedAt).toBeInstanceOf(Date);
      expect(save).toHaveBeenCalledWith(credential);
    });
  });

  describe('touchLastUsedAt', () => {
    it('returns true when a row was updated', async () => {
      await expect(repository.touchLastUsedAt(credentialId)).resolves.toBe(
        true,
      );
    });

    it('returns false when no row matched', async () => {
      update.mockResolvedValue({ affected: 0 });

      await expect(repository.touchLastUsedAt(credentialId)).resolves.toBe(
        false,
      );
    });
  });

  describe('listing', () => {
    it('lists only non-revoked credentials, newest first', async () => {
      await repository.findActiveCredentials(serviceAccountId);

      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: { revokedAt: expect.anything(), serviceAccountId },
      });
    });

    it('lists every credential of the account, newest first', async () => {
      await repository.findCredentials(serviceAccountId);

      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: { serviceAccountId },
      });
    });

    it('finds a credential by id', async () => {
      const credential = serviceAccountCredentialsFactory.build();
      findOne.mockResolvedValue(credential);

      await expect(repository.findCredentialById('id')).resolves.toBe(
        credential,
      );
      expect(findOne).toHaveBeenCalledWith({ where: { id: 'id' } });
    });
  });
});
