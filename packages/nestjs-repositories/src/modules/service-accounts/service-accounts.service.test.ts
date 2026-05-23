import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { ServiceAccountCredential } from './service-account-credential.entity';
import { ServiceAccount } from './service-account.entity';
import { SERVICE_ACCOUNT_BEARER_PREFIX } from './service-account-token.util';
import { ServiceAccountsService } from './service-accounts.service';

const serviceAccountId = '11111111-1111-4111-8111-111111111111';
const credentialId = '22222222-2222-4222-8222-222222222222';

describe('ServiceAccountsService', () => {
  type ServiceAccountRepo = {
    findOne: ReturnType<typeof vi.fn>;
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
      serviceAccountRepository.findOne.mockResolvedValue({
        disabledAt: new Date(),
        id: serviceAccountId,
      } as ServiceAccount);

      const result = await service.createCredential({
        serviceAccountId,
      });

      expect(result).toBeNull();
    });

    it('returns ot_sa token and saves bcrypt hash', async () => {
      serviceAccountRepository.findOne.mockResolvedValue({
        disabledAt: null,
        id: serviceAccountId,
      } as ServiceAccount);
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
      credentialRepository.findOne.mockResolvedValue({
        expiresAt: null,
        id: credentialId,
        revokedAt: null,
        secretHash: hash,
        serviceAccount: { disabledAt: null },
        serviceAccountId,
      } as ServiceAccountCredential);

      const result = await service.verifyBearerToken(
        `${SERVICE_ACCOUNT_BEARER_PREFIX}known_wrongsecret`,
      );

      expect(result).toBeNull();
    });

    it('returns null when credential is revoked', async () => {
      const secret = 'validSecret12';
      const hash = await service.hashSecret(secret);
      credentialRepository.findOne.mockResolvedValue({
        expiresAt: null,
        id: credentialId,
        prefix: 'known',
        revokedAt: new Date(),
        secretHash: hash,
        serviceAccount: { disabledAt: null },
        serviceAccountId,
      } as ServiceAccountCredential);

      const result = await service.verifyBearerToken(
        `${SERVICE_ACCOUNT_BEARER_PREFIX}known_${secret}`,
      );

      expect(result).toBeNull();
    });

    it('returns principal and touches last_used_at on success', async () => {
      const secret = 'validSecret12';
      const prefix = 'knownprefix1';
      const hash = await service.hashSecret(secret);
      credentialRepository.findOne.mockResolvedValue({
        expiresAt: null,
        id: credentialId,
        prefix,
        revokedAt: null,
        secretHash: hash,
        serviceAccount: { disabledAt: null },
        serviceAccountId,
      } as ServiceAccountCredential);

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
      const credential = {
        id: credentialId,
        revokedAt: null,
      } as ServiceAccountCredential;
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
});
