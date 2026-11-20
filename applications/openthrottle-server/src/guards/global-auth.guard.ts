import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  type AuthenticatedRequest,
  getAuthPrincipalFromRequest,
  IS_PUBLIC_KEY,
} from '@openthrottle/nestjs-auth';
import { getRequestFromExecutionContext } from '@openthrottle/nestjs-auth';
import { isRecord } from '@openthrottle/nodejs-utils';

import { GlobalClsAuthHook } from '../auth/global-cls-auth-hook/global-cls-auth-hook.service.ts';
import { ServiceAccountAuthService } from '../auth/service-account-auth/service-account-auth.service.ts';
import type { ServiceAccountAuthentication } from '../auth/service-account-auth/service-account-auth.types.ts';
import { GqlJwtAuthGuard } from './gql-jwt-auth.guard.ts';
import { CREDENTIAL_SCOPES_KEY } from './guards.constants.ts';
import { isCredentialScopeAllowed } from './guards.utils.ts';

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
 * @description Global auth guard: service-account bearer (`ot_sa_`) first, then JWT.
 * Use as APP_GUARD; mark login and health with @Public().
 * After successful auth, populates {@link GlobalClsService} via {@link GlobalClsAuthHook}.
 *
 * `@Public()` never 401s. When `Authorization` is present, soft-auth tries SA then JWT
 * and attaches a principal on success so public handlers (e.g. evaluateFeatureFlags) can
 * enrich targeting; invalid/missing credentials stay anonymous.
 *
 * A scoped service-account credential (non-null `scopes`) reaches only handlers that declare
 * one of its scopes with `@CredentialScope()`: anywhere else it is refused with 403, and on a
 * `@Public()` handler it stays anonymous. Guards run on root operations only (no
 * `fieldResolverEnhancers`), so the check gates each Query/Mutation field and REST route.
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuthGuard: GqlJwtAuthGuard,
    private readonly globalClsAuthHook: GlobalClsAuthHook,
    private readonly serviceAccountAuthService: ServiceAccountAuthService,
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
      const authentication =
        await this.serviceAccountAuthService.tryAuthenticateAuthorizationHeader(
          authorization,
        );

      if (authentication == null) {
        throw new UnauthorizedException('Unauthorized');
      }

      if (!this.isScopeAllowed(context, authentication)) {
        throw new ForbiddenException(
          'This credential is not scoped for this operation',
        );
      }

      req.user = authentication.principal;
      await this.globalClsAuthHook.populateFromPrincipal(
        authentication.principal,
      );
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
      const authentication =
        await this.serviceAccountAuthService.tryAuthenticateAuthorizationHeader(
          authorization,
        );

      if (
        authentication == null ||
        !this.isScopeAllowed(context, authentication)
      ) {
        return;
      }

      req.user = authentication.principal;
      await this.globalClsAuthHook.populateFromPrincipal(
        authentication.principal,
      );
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

  /**
   * @description Whether the verified credential's scopes admit this handler (see
   * {@link isCredentialScopeAllowed}).
   */
  private isScopeAllowed(
    context: ExecutionContext,
    authentication: ServiceAccountAuthentication,
  ): boolean {
    const handlerScopes =
      this.reflector.getAllAndOverride<readonly string[] | undefined>(
        CREDENTIAL_SCOPES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    return isCredentialScopeAllowed(authentication.scopes, handlerScopes);
  }
}
