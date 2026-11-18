import { createMock } from '@golevelup/ts-vitest';
import { UnauthorizedException } from '@nestjs/common';
import { authPrincipalFromServiceAccountId } from '@openthrottle/nestjs-auth';
import type { ServiceAccountCredentialsRepository } from '@openthrottle/nestjs-repositories-server';
import type { ServiceAccountCredentialsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { createServiceAccountCredentialsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ServiceAccountAuthService } from './service-account-auth.service.ts';

describe('ServiceAccountAuthService', () => {
  let credentials: ServiceAccountCredentialsRepositoryMock;
  let service: ServiceAccountAuthService;

  beforeEach(() => {
    credentials = createServiceAccountCredentialsRepositoryMock();
    service = new ServiceAccountAuthService(
      createMock<ServiceAccountCredentialsRepository>(credentials),
    );
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

      expect(credentials.verifyBearerToken).not.toHaveBeenCalled();
    });

    it('returns null when verification fails', async () => {
      credentials.verifyBearerToken.mockResolvedValue(null);

      await expect(
        service.tryAuthenticateAuthorizationHeader('Bearer ot_sa_p_s'),
      ).resolves.toBeNull();
    });

    it('returns principal when verification succeeds', async () => {
      const serviceAccountId = '11111111-1111-4111-8111-111111111111';
      credentials.verifyBearerToken.mockResolvedValue({
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
      credentials.verifyBearerToken.mockResolvedValue(null);

      await expect(
        service.authenticateAuthorizationHeader('Bearer ot_sa_p_s'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
