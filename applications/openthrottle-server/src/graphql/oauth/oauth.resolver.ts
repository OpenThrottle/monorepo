/**
 * @description GraphQL resolver for the OAuth consent screen and the signed-in user's
 * connected clients (OT plan 16f321a7). Every operation needs an interactive human
 * session: service accounts can never consent, and a token minted by OAuth must not be
 * able to approve further OAuth grants.
 */

import { ForbiddenException } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type {
  AuthPrincipal,
  UserAuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  AUTH_PRINCIPAL_KIND_USER,
  CurrentUser,
} from '@openthrottle/nestjs-auth';
import type { OAuthScope } from '@openthrottle/nestjs-repositories';
import {
  OAUTH_GRANT_REVOKED_REASONS,
  OAUTH_SUPPORTED_SCOPES,
  OAuthService,
} from '@openthrottle/nestjs-repositories';
import { GraphQLError } from 'graphql';

import {
  buildAuthorizationRedirect,
  resolveOAuthServerConfig,
} from '../../modules/oauth/oauth.utils.ts';
import { assertHumanAuthPrincipal } from '../service-accounts/service-accounts.utils.ts';
import { DecideOAuthAuthorizationInput } from './oauth.input.ts';
import {
  toOAuthAuthorizationRequestObject,
  toOAuthGrantObject,
} from './oauth.mapper.ts';
import {
  DecideOAuthAuthorizationResultObject,
  OAuthAuthorizationRequestObject,
  OAuthGrantObject,
} from './oauth.object.ts';

/**
 * @description A human principal from an interactive session. An OAuth-authenticated
 * request is refused: a token must never be able to approve, list or revoke grants.
 */
const assertInteractiveHuman = (
  principal: AuthPrincipal | undefined,
): UserAuthPrincipal => {
  const user = assertHumanAuthPrincipal(principal);
  if (user.oauth !== undefined) {
    throw new ForbiddenException(
      'OAuth tokens cannot manage OAuth authorizations',
    );
  }
  return user;
};

const isOAuthScope = (value: string): value is OAuthScope => {
  return OAUTH_SUPPORTED_SCOPES.some((scope) => scope === value);
};

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a).
// Every operation additionally asserts a human principal; permissions are deliberately not
// required, so a read-only (viewer) user can still consent to a read-only client.
@Resolver(() => OAuthGrantObject)
export class OAuthResolver {
  constructor(private readonly oauthService: OAuthService) {}

  @Query(() => OAuthAuthorizationRequestObject, {
    description: `A pending OAuth authorization request for the consent screen, or null when it is unknown, decided or expired.`,
    nullable: true,
  })
  async oauthAuthorizationRequest(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => String }) id: string,
  ): Promise<OAuthAuthorizationRequestObject | null> {
    assertInteractiveHuman(principal);
    const request = await this.oauthService.findPendingAuthorizationRequest(
      id,
      new Date(),
    );
    return request === null ? null : toOAuthAuthorizationRequestObject(request);
  }

  @Mutation(() => DecideOAuthAuthorizationResultObject, {
    description: `Approve or deny a pending OAuth authorization request as the signed-in user. Returns the client redirect URL to send the browser to.`,
  })
  async decideOAuthAuthorization(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => DecideOAuthAuthorizationInput })
    input: DecideOAuthAuthorizationInput,
  ): Promise<DecideOAuthAuthorizationResultObject> {
    const user = assertInteractiveHuman(principal);
    const config = resolveOAuthServerConfig(process.env);
    if (config.kind !== 'enabled') {
      throw new ForbiddenException('OAuth is not enabled on this server');
    }

    const result = await this.oauthService.decideAuthorizationRequest({
      approve: input.approve,
      id: input.id,
      now: new Date(),
      scopes: input.scopes.filter(isOAuthScope),
      userId: user.sub,
    });
    if (!result.ok) {
      throw new GraphQLError(result.description, {
        extensions: { code: 'BAD_REQUEST', reason: result.error },
      });
    }

    const { request } = result;
    const { issuer } = config.config;
    const params: Record<string, string | null> = {
      iss: issuer,
      state: request.state,
    };
    if (result.kind === 'approved') {
      params.code = result.code;
    } else {
      params.error = 'access_denied';
    }

    const object = new DecideOAuthAuthorizationResultObject();
    object.redirectUrl = buildAuthorizationRedirect(
      request.redirectUri,
      params,
    );
    return object;
  }

  @Query(() => [String], {
    description: `The OAuth scopes of the access token this request authenticated with, or null when it did not use an OAuth token. Lets the MCP server answer insufficient_scope before running a write tool.`,
    nullable: true,
  })
  viewerOAuthScopes(
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): string[] | null {
    if (
      principal?.kind !== AUTH_PRINCIPAL_KIND_USER ||
      principal.oauth === undefined
    ) {
      return null;
    }
    return [...principal.oauth.scopes];
  }

  @Query(() => [OAuthGrantObject], {
    description: `Clients the signed-in user has authorized via OAuth that are still live, newest first.`,
  })
  async myOAuthGrants(
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<OAuthGrantObject[]> {
    const user = assertInteractiveHuman(principal);
    const grants = await this.oauthService.listActiveGrantsForUser(
      user.sub,
      new Date(),
    );
    return grants.map(toOAuthGrantObject);
  }

  @Mutation(() => Boolean, {
    description: `Revoke one of the signed-in user's OAuth grants and every token under it. False when no live grant of theirs matched.`,
  })
  async revokeOAuthGrant(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => String }) id: string,
  ): Promise<boolean> {
    const user = assertInteractiveHuman(principal);
    return this.oauthService.revokeGrant({
      grantId: id,
      now: new Date(),
      reason: OAUTH_GRANT_REVOKED_REASONS.USER,
      userId: user.sub,
    });
  }
}
