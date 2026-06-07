import {
  type ExecutionContext,
  Injectable,
  type CanActivate,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  getAuthPrincipalFromRequest,
  IS_PUBLIC_KEY,
} from '@openthrottle/nestjs-auth';
import { GlobalClsAuthHook } from '../auth/global-cls-auth-hook.service';
import { ServiceAccountAuthService } from '../auth/service-account-auth.service';
import { GqlJwtAuthGuard } from './gql-jwt-auth.guard';
import { getRequestFromExecutionContext } from './get-request-from-execution-context';

type RequestWithAuthHeader = {
  headers?: { authorization?: string | string[] };
  user?: unknown;
};

const readAuthorizationHeader = (
  req: RequestWithAuthHeader,
): string | undefined => {
  const raw = req.headers?.authorization;

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
      return true;
    }

    const req = getRequestFromExecutionContext(
      context,
    ) as RequestWithAuthHeader;
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
}
