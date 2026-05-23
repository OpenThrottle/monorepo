import { UnauthorizedException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-vitest';
import { authPrincipalFromServiceAccountId } from '@openthrottle/nestjs-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceAccountsService } from '@openthrottle/nestjs-repositories';
import { ServiceAccountAuthService } from './service-account-auth.service';

describe('ServiceAccountAuthService', () => {
  let serviceAccountsService: ServiceAccountsService;
  let service: ServiceAccountAuthService;

  beforeEach(() => {
    serviceAccountsService = createMock<ServiceAccountsService>({
      verifyBearerToken: vi.fn(),
    });
    service = new ServiceAccountAuthService(serviceAccountsService);
  });

  describe('isServiceAccountAuthorization', () => {
    it('returns true for ot_sa bearer tokens', () => {
      expect(
        service.isServiceAccountAuthorization('Bearer ot_sa_abc_secret'),
      ).toBe(true);
    });

    it('returns false for JWT-style bearer tokens', () => {
      expect(
        service.isServiceAccountAuthorization('Bearer eyJhbGciOiJIUzI1NiJ9'),
      ).toBe(false);
    });
  });

  describe('tryAuthenticateAuthorizationHeader', () => {
    it('returns null when header is not a service account token', async () => {
      await expect(
        service.tryAuthenticateAuthorizationHeader('Bearer jwt-here'),
      ).resolves.toBeNull();

      expect(serviceAccountsService.verifyBearerToken).not.toHaveBeenCalled();
    });

    it('returns null when verification fails', async () => {
      vi.mocked(serviceAccountsService.verifyBearerToken).mockResolvedValue(
        null,
      );

      await expect(
        service.tryAuthenticateAuthorizationHeader('Bearer ot_sa_p_s'),
      ).resolves.toBeNull();
    });

    it('returns principal when verification succeeds', async () => {
      const serviceAccountId = '11111111-1111-4111-8111-111111111111';
      vi.mocked(serviceAccountsService.verifyBearerToken).mockResolvedValue({
        credentialId: 'cred-1',
        serviceAccountId,
      });

      await expect(
        service.tryAuthenticateAuthorizationHeader('Bearer ot_sa_p_s'),
      ).resolves.toEqual(authPrincipalFromServiceAccountId(serviceAccountId));
    });
  });

  describe('authenticateAuthorizationHeader', () => {
    it('throws UnauthorizedException when verification fails', async () => {
      vi.mocked(serviceAccountsService.verifyBearerToken).mockResolvedValue(
        null,
      );

      await expect(
        service.authenticateAuthorizationHeader('Bearer ot_sa_p_s'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
