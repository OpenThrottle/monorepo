import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import { ServiceAccountCredential } from './service-account-credential.entity';
import { ServiceAccount } from './service-account.entity';
import { SERVICE_ACCOUNT_BEARER_PREFIX } from './service-account-token.util';
import { ServiceAccountsService } from './service-accounts.service';

const serviceAccountId = '11111111-1111-4111-8111-111111111111';
const credentialId = '22222222-2222-4222-8222-222222222222';

describe('ServiceAccountsService', () => {
  type ServiceAccountRepo = {
    findOne: ReturnType<typeof vi.fn>;
    merge: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  type CredentialRepo = {
    create: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  let service: ServiceAccountsService;
  let serviceAccountRepository: ServiceAccountRepo;
  let credentialRepository: CredentialRepo;

  beforeEach(async () => {
    serviceAccountRepository = {
      findOne: vi.fn(),
      merge: vi.fn((entity: ServiceAccount, patch: Partial<ServiceAccount>) =>
        Object.assign(entity, patch),
      ),
      save: vi.fn(async (entity: ServiceAccount) => entity),
    };
    credentialRepository = {
      create: vi.fn((data: Partial<ServiceAccountCredential>) => data),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      save: vi.fn(async (entity: ServiceAccountCredential) => ({
        ...entity,
        createdAt: new Date(),
        id: credentialId,
      })),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    const app = await Test.createTestingModule({
      providers: [
        ServiceAccountsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(ServiceAccount),
          useValue: serviceAccountRepository,
        },
        {
          provide: getRepositoryToken(ServiceAccountCredential),
          useValue: credentialRepository,
        },
      ],
    }).compile();

    service = app.get(ServiceAccountsService);
  });

  describe('createCredential', () => {
    it('returns null when service account is missing', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(null);

      const result = await service.createCredential({
        serviceAccountId,
      });

      expect(result).toBeNull();
    });

    it('returns null when service account is disabled', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({
          disabledAt: new Date(),
          id: serviceAccountId,
        }),
      );

      const result = await service.createCredential({
        serviceAccountId,
      });

      expect(result).toBeNull();
    });

    it('returns ot_sa token and saves bcrypt hash', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({
          disabledAt: null,
          id: serviceAccountId,
        }),
      );
      credentialRepository.findOne.mockResolvedValue(null);

      const result = await service.createCredential({
        label: 'mcp',
        serviceAccountId,
      });

      expect(result).not.toBeNull();
      expect(result!.token).toMatch(
        new RegExp(
          `^${SERVICE_ACCOUNT_BEARER_PREFIX}[a-zA-Z0-9]+_[a-zA-Z0-9]+$`,
        ),
      );
      expect(credentialRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'mcp',
          prefix: expect.any(String),
          secretHash: expect.stringMatching(/^\$2[aby]\$/),
          serviceAccountId,
        }),
      );
    });
  });

  describe('upsertCredentialForToken', () => {
    const prefix = 'knownprefix1';
    const secret = 'validSecret12';
    const token = `${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_${secret}`;

    it('returns null when the service account is missing', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(null);

      const result = await service.upsertCredentialForToken({
        serviceAccountId,
        token,
      });

      expect(result).toBeNull();
      expect(credentialRepository.save).not.toHaveBeenCalled();
    });

    it('returns null when the service account is disabled', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({
          disabledAt: new Date(),
          id: serviceAccountId,
        }),
      );

      const result = await service.upsertCredentialForToken({
        serviceAccountId,
        token,
      });

      expect(result).toBeNull();
    });

    it('throws when the token is not an ot_sa_<prefix>_<secret> token', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({ disabledAt: null, id: serviceAccountId }),
      );

      await expect(
        service.upsertCredentialForToken({
          serviceAccountId,
          token: 'deadbeefdeadbeefdeadbeefdeadbeef',
        }),
      ).rejects.toThrow(/ot_sa_<prefix>_<secret>/);
    });

    it('creates a credential whose stored hash verifies the token', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({ disabledAt: null, id: serviceAccountId }),
      );
      credentialRepository.findOne.mockResolvedValue(null);

      const result = await service.upsertCredentialForToken({
        label: 'mcp',
        serviceAccountId,
        token,
      });

      expect(result).not.toBeNull();
      expect(result!.action).toBe('created');
      const savedArg = credentialRepository.save.mock.calls[0]![0];
      expect(savedArg).toEqual(
        expect.objectContaining({
          label: 'mcp',
          prefix,
          secretHash: expect.stringMatching(/^\$2[aby]\$/),
          serviceAccountId,
        }),
      );
      expect(await service.validateSecret(secret, savedArg.secretHash)).toBe(
        true,
      );
    });

    it('is a no-op when a non-revoked credential already matches the token', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({ disabledAt: null, id: serviceAccountId }),
      );
      const secretHash = await service.hashSecret(secret);
      credentialRepository.findOne.mockResolvedValue(
        asMock<ServiceAccountCredential>({
          id: credentialId,
          prefix,
          revokedAt: null,
          secretHash,
          serviceAccountId,
        }),
      );

      const result = await service.upsertCredentialForToken({
        serviceAccountId,
        token,
      });

      expect(result!.action).toBe('noop');
      expect(credentialRepository.save).not.toHaveBeenCalled();
    });

    it('rehashes and un-revokes in place when an existing credential is stale', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({ disabledAt: null, id: serviceAccountId }),
      );
      const staleHash = await service.hashSecret('a-different-secret');
      const existing = asMock<ServiceAccountCredential>({
        id: credentialId,
        prefix,
        revokedAt: new Date(),
        secretHash: staleHash,
        serviceAccountId,
      });
      credentialRepository.findOne.mockResolvedValue(existing);

      const result = await service.upsertCredentialForToken({
        serviceAccountId,
        token,
      });

      expect(result!.action).toBe('updated');
      expect(existing.revokedAt).toBeNull();
      expect(await service.validateSecret(secret, existing.secretHash)).toBe(
        true,
      );
      expect(credentialRepository.save).toHaveBeenCalledWith(existing);
    });

    it('throws when the prefix belongs to a different service account', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({ disabledAt: null, id: serviceAccountId }),
      );
      credentialRepository.findOne.mockResolvedValue(
        asMock<ServiceAccountCredential>({
          id: credentialId,
          prefix,
          revokedAt: null,
          secretHash: await service.hashSecret(secret),
          serviceAccountId: '99999999-9999-4999-8999-999999999999',
        }),
      );

      await expect(
        service.upsertCredentialForToken({ serviceAccountId, token }),
      ).rejects.toThrow(/different service account/);
    });
  });

  describe('verifyBearerToken', () => {
    it('returns null for JWT-shaped bearer', async () => {
      const result = await service.verifyBearerToken(
        'Bearer eyJhbGciOiJIUzI1NiJ9',
      );

      expect(result).toBeNull();
      expect(credentialRepository.update).not.toHaveBeenCalled();
    });

    it('returns null when prefix is unknown', async () => {
      credentialRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyBearerToken(
        `${SERVICE_ACCOUNT_BEARER_PREFIX}unknown_secretpart`,
      );

      expect(result).toBeNull();
      expect(credentialRepository.update).not.toHaveBeenCalled();
    });

    it('returns null when secret does not match hash', async () => {
      const hash = await service.hashSecret('correct-secret');
      credentialRepository.findOne.mockResolvedValue(
        asMock<ServiceAccountCredential>({
          expiresAt: null,
          id: credentialId,
          revokedAt: null,
          secretHash: hash,
          serviceAccount: { disabledAt: null },
          serviceAccountId,
        }),
      );

      const result = await service.verifyBearerToken(
        `${SERVICE_ACCOUNT_BEARER_PREFIX}known_wrongsecret`,
      );

      expect(result).toBeNull();
    });

    it('returns null when credential is revoked', async () => {
      const secret = 'validSecret12';
      const hash = await service.hashSecret(secret);
      credentialRepository.findOne.mockResolvedValue(
        asMock<ServiceAccountCredential>({
          expiresAt: null,
          id: credentialId,
          prefix: 'known',
          revokedAt: new Date(),
          secretHash: hash,
          serviceAccount: { disabledAt: null },
          serviceAccountId,
        }),
      );

      const result = await service.verifyBearerToken(
        `${SERVICE_ACCOUNT_BEARER_PREFIX}known_${secret}`,
      );

      expect(result).toBeNull();
    });

    it('returns principal and touches last_used_at on success', async () => {
      const secret = 'validSecret12';
      const prefix = 'knownprefix1';
      const hash = await service.hashSecret(secret);
      credentialRepository.findOne.mockResolvedValue(
        asMock<ServiceAccountCredential>({
          expiresAt: null,
          id: credentialId,
          prefix,
          revokedAt: null,
          secretHash: hash,
          serviceAccount: { disabledAt: null },
          serviceAccountId,
        }),
      );

      const result = await service.verifyBearerToken(
        `Bearer ${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_${secret}`,
      );

      expect(result).toEqual({
        credentialId,
        serviceAccountId,
      });
      expect(credentialRepository.update).toHaveBeenCalledWith(
        { id: credentialId },
        { lastUsedAt: expect.any(Date) },
      );
    });
  });

  describe('revokeCredential', () => {
    it('returns false when credential is missing', async () => {
      credentialRepository.findOne.mockResolvedValue(null);

      expect(await service.revokeCredential(credentialId)).toBe(false);
    });

    it('sets revoked_at when credential is active', async () => {
      const credential = asMock<ServiceAccountCredential>({
        id: credentialId,
        revokedAt: null,
      });
      credentialRepository.findOne.mockResolvedValue(credential);

      const revoked = await service.revokeCredential(credentialId);

      expect(revoked).toBe(true);
      expect(credential.revokedAt).toBeInstanceOf(Date);
      expect(credentialRepository.save).toHaveBeenCalledWith(credential);
    });
  });

  describe('hashSecret and validateSecret', () => {
    it('validates a hash produced by hashSecret', async () => {
      const hash = await service.hashSecret('test-secret');
      expect(await service.validateSecret('test-secret', hash)).toBe(true);
      expect(await service.validateSecret('wrong', hash)).toBe(false);
    });
  });

  describe('update', () => {
    const actingUserId = '33333333-3333-4333-8333-333333333333';

    it('sets actingUserId', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({
          actingUserId: null,
          disabledAt: null,
          id: serviceAccountId,
        }),
      );

      const updated = await service.update(serviceAccountId, {
        actingUserId,
      });

      expect(updated?.actingUserId).toBe(actingUserId);
    });

    it('clears actingUserId with an explicit null', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({
          actingUserId,
          disabledAt: null,
          id: serviceAccountId,
        }),
      );

      const updated = await service.update(serviceAccountId, {
        actingUserId: null,
      });

      expect(updated?.actingUserId).toBeNull();
    });

    it('leaves actingUserId unchanged when omitted', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({
          actingUserId,
          disabledAt: null,
          id: serviceAccountId,
        }),
      );

      const updated = await service.update(serviceAccountId, {
        description: 'renamed',
      });

      expect(updated?.actingUserId).toBe(actingUserId);
    });
  });

  describe('resolveActingUserId', () => {
    const actingUserId = '33333333-3333-4333-8333-333333333333';

    it('returns the linked user for an enabled account', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({
          actingUserId,
          disabledAt: null,
          id: serviceAccountId,
        }),
      );

      expect(await service.resolveActingUserId(serviceAccountId)).toBe(
        actingUserId,
      );
    });

    it('returns null for an unlinked account', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({
          actingUserId: null,
          disabledAt: null,
          id: serviceAccountId,
        }),
      );

      expect(await service.resolveActingUserId(serviceAccountId)).toBeNull();
    });

    it('returns null for a disabled account even when linked', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(
        asMock<ServiceAccount>({
          actingUserId,
          disabledAt: new Date(),
          id: serviceAccountId,
        }),
      );

      expect(await service.resolveActingUserId(serviceAccountId)).toBeNull();
    });

    it('returns null for a missing account', async () => {
      serviceAccountRepository.findOne.mockResolvedValue(null);

      expect(await service.resolveActingUserId(serviceAccountId)).toBeNull();
    });
  });
});
