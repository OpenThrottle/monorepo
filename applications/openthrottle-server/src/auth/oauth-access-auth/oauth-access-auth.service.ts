/**
 * @description Validates `Bearer ot_oat_<prefix>_<secret>` OAuth access tokens (OT plan
 * 16f321a7) and returns the consenting user's principal with the grant attached, so every
 * existing permission check applies to the token exactly as it does to that user's JWT.
 *
 * Valid means: the token and its grant are live (OAuthService.verifyAccessToken), the
 * grant's resource is one this server is configured to issue for (`OT_MCP_PUBLIC_URL`,
 * RFC 8707 audience), and the user is not disabled. Anything else is "not authenticated".
 */

import { Injectable } from '@nestjs/common';
import type { UserAuthPrincipal } from '@openthrottle/nestjs-auth';
import { authPrincipalFromOAuthGrant } from '@openthrottle/nestjs-auth';
import {
  isOAuthAccessTokenAuthorization,
  OAuthService,
  UsersService,
} from '@openthrottle/nestjs-repositories-server';

import { resolveOAuthServerConfig } from '../../modules/oauth/oauth.utils.ts';

@Injectable()
export class OAuthAccessAuthService {
  private readonly resources: readonly string[];

  constructor(
    private readonly oauthService: OAuthService,
    private readonly usersService: UsersService,
  ) {
    const config = resolveOAuthServerConfig(process.env);
    this.resources = config.kind === 'enabled' ? config.config.resources : [];
  }

  /**
   * @description True when the header carries an OAuth access token (whether or not it is valid).
   */
  isOAuthAuthorization(authorization: string | undefined): boolean {
    if (authorization == null || authorization === '') {
      return false;
    }
    return isOAuthAccessTokenAuthorization(authorization);
  }

  /**
   * @description The consenting user's principal, or null for an invalid, expired, revoked,
   * wrong-audience or disabled-user token — and always null while OAuth is not configured.
   */
  async tryAuthenticateAuthorizationHeader(
    authorization: string,
  ): Promise<UserAuthPrincipal | null> {
    if (
      this.resources.length === 0 ||
      !this.isOAuthAuthorization(authorization)
    ) {
      return null;
    }

    const verified = await this.oauthService.verifyAccessToken(
      authorization,
      new Date(),
    );
    if (verified === null || !this.resources.includes(verified.resource)) {
      return null;
    }

    const user = await this.usersService.findById(verified.userId);
    if (user === null || user.disabledAt != null) {
      return null;
    }

    return authPrincipalFromOAuthGrant(verified.userId, {
      clientId: verified.clientId,
      grantId: verified.grantId,
      scopes: verified.scopes,
    });
  }
}
