/**
 * @description Global JWT guard that enforces auth on all resolvers/controllers unless marked @Public().
 * Use as APP_GUARD; mark login and health with @Public().
 * After a successful JWT check, populates {@link GlobalClsService} via {@link GlobalClsAuthHook} (GraphQL + REST).
 */

import {
  type ExecutionContext,
  Injectable,
  type CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { GlobalClsAuthHook } from '../auth/global-cls-auth-hook.service';
import { GqlJwtAuthGuard } from './gql-jwt-auth.guard';
import { getRequestFromExecutionContext } from './get-request-from-execution-context';
import { getJwtPayloadFromRequest } from './jwt-payload-from-request';

@Injectable()
export class GlobalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuthGuard: GqlJwtAuthGuard,
    private readonly globalClsAuthHook: GlobalClsAuthHook,
    private readonly logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // FIXME: ENABLE_AUTHENTICATION is disabled and we're not checking for it here.
    const isAuthEnabled = process.env.APP_ENABLE_AUTHENTICATION === 'true';
    if (!isAuthEnabled) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const allowed = await this.jwtAuthGuard.canActivate(context);
    if (!allowed && !isAuthEnabled) {
      return false;
    }

    const req = getRequestFromExecutionContext(context);
    const user = getJwtPayloadFromRequest(req);

    if (user != null) {
      await this.globalClsAuthHook.populateFromJwtPayload(user);
    }

    // FIXME: We'll need to handle the env and re-authentication workflows
    if (!isAuthEnabled) {
      const message = `🔒 GlobalJwtAuthGuard: not public and authentication is disabled, allowing access for right now...`;

      this.logger.debug(message);
    }

    return true;
  }
}
