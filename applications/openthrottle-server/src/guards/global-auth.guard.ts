import type { CanActivate, ExecutionContext } from '@nestjs/common';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { GqlContextType } from '@nestjs/graphql';
import { GqlExecutionContext } from '@nestjs/graphql';
import type {
  AuthenticatedRequest,
  UserAuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  getAuthPrincipalFromRequest,
  IS_PUBLIC_KEY,
} from '@openthrottle/nestjs-auth';
import { getRequestFromExecutionContext } from '@openthrottle/nestjs-auth';
import { scopesAllowWrite } from '@openthrottle/nestjs-repositories-server';
import { isRecord } from '@openthrottle/nodejs-utils';
import { GraphQLError } from 'graphql';

import { GlobalClsAuthHook } from '../auth/global-cls-auth-hook/global-cls-auth-hook.service.ts';
import { OAuthAccessAuthService } from '../auth/oauth-access-auth/oauth-access-auth.service.ts';
import { ServiceAccountAuthService } from '../auth/service-account-auth/service-account-auth.service.ts';
import { GqlJwtAuthGuard } from './gql-jwt-auth.guard.ts';

const READ_ONLY_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * @description Whether the operation writes: a GraphQL mutation, or a non-safe HTTP method
 * on a REST route. Queries and subscriptions read.
 */
const isWriteOperation = (context: ExecutionContext): boolean => {
  if (context.getType<GqlContextType>() === 'graphql') {
    const info: unknown = GqlExecutionContext.create(context).getInfo();
    if (!isRecord(info) || !isRecord(info.operation)) {
      return true;
    }
    return info.operation.operation === 'mutation';
  }
  const req: unknown = context.switchToHttp().getRequest();
  const method =
    isRecord(req) && typeof req.method === 'string' ? req.method : '';
  return !READ_ONLY_HTTP_METHODS.has(method.toUpperCase());
};

/**
 * @description Refuses a write by a read-only OAuth token (scopes only subtract from the
 * user's permissions; design docs/openthrottle/mcp-oauth-design.md § Scopes and RBAC).
 */
const assertOAuthScopeAllows = (
  context: ExecutionContext,
  principal: UserAuthPrincipal,
): void => {
  if (
    principal.oauth === undefined ||
    scopesAllowWrite(principal.oauth.scopes)
  ) {
    return;
  }
  if (!isWriteOperation(context)) {
    return;
  }
  const message = `This OAuth token is read-only: writes need the mcp:write scope.`;
  if (context.getType<GqlContextType>() === 'graphql') {
    throw new GraphQLError(message, {
      extensions: {
        code: 'FORBIDDEN',
        reason: 'INSUFFICIENT_SCOPE',
        scope: 'mcp:write',
      },
    });
  }
  throw new ForbiddenException(message);
};

const readAuthorizationHeader = (req: object): string | undefined => {
  const headers = 'headers' in req ? req.headers : undefined;
  const raw = isRecord(headers) ? headers.authorization : undefined;

  if (typeof raw === 'string') {
    return raw;
  }

  if (Array.isArray(raw) && typeof raw[0] === 'string') {
    return raw[0];
  }

  return undefined;
};

/**
 * @description Global auth guard: service-account bearer (`ot_sa_`) first, then an OAuth
 * access token (`ot_oat_`, the consenting user's principal with its grant attached and
 * mutations refused without `mcp:write`), then JWT.
 * Use as APP_GUARD; mark login and health with @Public().
 * After successful auth, populates {@link GlobalClsService} via {@link GlobalClsAuthHook}.
 *
 * `@Public()` never 401s. When `Authorization` is present, soft-auth tries SA then JWT
 * and attaches a principal on success so public handlers (e.g. evaluateFeatureFlags) can
 * enrich targeting; invalid/missing credentials stay anonymous.
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuthGuard: GqlJwtAuthGuard,
    private readonly globalClsAuthHook: GlobalClsAuthHook,
    private readonly serviceAccountAuthService: ServiceAccountAuthService,
    private readonly oauthAccessAuthService: OAuthAccessAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const req = getRequestFromExecutionContext(context);

      if (req != null) {
        await this.softAuthenticate(context, req);
      }

      return true;
    }

    const req = getRequestFromExecutionContext(context);

    if (req == null) {
      throw new UnauthorizedException('Unauthorized');
    }

    const authorization = readAuthorizationHeader(req);

    if (
      authorization != null &&
      this.serviceAccountAuthService.isServiceAccountAuthorization(
        authorization,
      )
    ) {
      const principal =
        await this.serviceAccountAuthService.tryAuthenticateAuthorizationHeader(
          authorization,
        );

      if (principal == null) {
        throw new UnauthorizedException('Unauthorized');
      }

      req.user = principal;
      await this.globalClsAuthHook.populateFromPrincipal(principal);
      return true;
    }

    if (
      authorization != null &&
      this.oauthAccessAuthService.isOAuthAuthorization(authorization)
    ) {
      const principal =
        await this.oauthAccessAuthService.tryAuthenticateAuthorizationHeader(
          authorization,
        );

      if (principal == null) {
        throw new UnauthorizedException('Unauthorized');
      }

      assertOAuthScopeAllows(context, principal);
      req.user = principal;
      await this.globalClsAuthHook.populateFromPrincipal(principal);
      return true;
    }

    const allowed = await this.jwtAuthGuard.canActivate(context);
    if (!allowed) {
      return false;
    }

    const principal = getAuthPrincipalFromRequest(req);

    if (principal != null) {
      await this.globalClsAuthHook.populateFromPrincipal(principal);
    }

    return true;
  }

  /**
   * @description Optional auth for `@Public()` handlers. Never throws: missing or
   * invalid credentials leave the request anonymous.
   */
  private async softAuthenticate(
    context: ExecutionContext,
    req: AuthenticatedRequest,
  ): Promise<void> {
    const authorization = readAuthorizationHeader(req);

    if (authorization == null) {
      return;
    }

    if (
      this.serviceAccountAuthService.isServiceAccountAuthorization(
        authorization,
      )
    ) {
      const principal =
        await this.serviceAccountAuthService.tryAuthenticateAuthorizationHeader(
          authorization,
        );

      if (principal == null) {
        return;
      }

      req.user = principal;
      await this.globalClsAuthHook.populateFromPrincipal(principal);
      return;
    }

    if (this.oauthAccessAuthService.isOAuthAuthorization(authorization)) {
      const principal =
        await this.oauthAccessAuthService.tryAuthenticateAuthorizationHeader(
          authorization,
        );

      if (principal == null) {
        return;
      }

      req.user = principal;
      await this.globalClsAuthHook.populateFromPrincipal(principal);
      return;
    }

    const allowed = await this.jwtAuthGuard.tryAuthenticate(context);

    if (!allowed) {
      return;
    }

    const principal = getAuthPrincipalFromRequest(req);

    if (principal != null) {
      await this.globalClsAuthHook.populateFromPrincipal(principal);
    }
  }
}
