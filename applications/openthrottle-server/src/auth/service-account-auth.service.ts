/**
 * @description Validates `Bearer ot_sa_<prefix>_<secret>` and returns an {@link AuthPrincipal}.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  authPrincipalFromServiceAccountId,
  type ServiceAccountAuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  normalizeServiceAccountBearerToken,
  ServiceAccountsService,
} from '@openthrottle/nestjs-repositories';

@Injectable()
export class ServiceAccountAuthService {
  constructor(
    private readonly serviceAccountsService: ServiceAccountsService,
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
   * @description Verifies a service-account bearer and returns the principal, or throws {@link UnauthorizedException}.
   */
  async authenticateAuthorizationHeader(
    authorization: string,
  ): Promise<ServiceAccountAuthPrincipal> {
    const principal =
      await this.tryAuthenticateAuthorizationHeader(authorization);

    if (principal == null) {
      throw new UnauthorizedException('Unauthorized');
    }

    return principal;
  }

  /**
   * @description Verifies `Bearer ot_sa_…` when present; returns null for non–service-account headers or invalid tokens.
   */
  async tryAuthenticateAuthorizationHeader(
    authorization: string,
  ): Promise<ServiceAccountAuthPrincipal | null> {
    if (!this.isServiceAccountAuthorization(authorization)) {
      return null;
    }

    const verified =
      await this.serviceAccountsService.verifyBearerToken(authorization);

    if (verified == null) {
      return null;
    }

    return authPrincipalFromServiceAccountId(verified.serviceAccountId);
  }
}
