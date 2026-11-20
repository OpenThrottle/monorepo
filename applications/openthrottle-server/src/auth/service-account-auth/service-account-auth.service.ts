/**
 * @description Validates `Bearer ot_sa_<prefix>_<secret>` and returns the {@link AuthPrincipal}
 * it acts as, with the credential's scope allow-list.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { authPrincipalFromServiceAccountId } from '@openthrottle/nestjs-auth';
import {
  normalizeServiceAccountBearerToken,
  ServiceAccountCredentialsRepository,
} from '@openthrottle/nestjs-repositories-server';

import type { ServiceAccountAuthentication } from './service-account-auth.types.ts';

@Injectable()
export class ServiceAccountAuthService {
  constructor(
    private readonly serviceAccountCredentialsRepository: ServiceAccountCredentialsRepository,
  ) {}

  /**
   * @description Returns true when the value is a service-account bearer token (after optional `Bearer `).
   */
  isServiceAccountAuthorization(authorization: string | undefined): boolean {
    if (authorization == null || authorization === '') {
      return false;
    }

    return normalizeServiceAccountBearerToken(authorization) != null;
  }

  /**
   * @description Verifies a service-account bearer and returns its authentication, or throws {@link UnauthorizedException}.
   */
  async authenticateAuthorizationHeader(
    authorization: string,
  ): Promise<ServiceAccountAuthentication> {
    const authentication =
      await this.tryAuthenticateAuthorizationHeader(authorization);

    if (authentication == null) {
      throw new UnauthorizedException('Unauthorized');
    }

    return authentication;
  }

  /**
   * @description Verifies `Bearer ot_sa_…` when present; returns null for non–service-account headers or invalid tokens.
   */
  async tryAuthenticateAuthorizationHeader(
    authorization: string,
  ): Promise<ServiceAccountAuthentication | null> {
    if (!this.isServiceAccountAuthorization(authorization)) {
      return null;
    }

    const verified =
      await this.serviceAccountCredentialsRepository.verifyBearerToken(
        authorization,
      );

    if (verified == null) {
      return null;
    }

    return {
      principal: authPrincipalFromServiceAccountId(verified.serviceAccountId),
      scopes: verified.scopes,
    };
  }
}
