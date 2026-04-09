/**
 * @description Guard that enforces permission-based access using DB-backed user roles and permissions.
 * Use with @Permissions() from @openthrottle/nestjs-rbac after JWT auth so request.user is set.
 */

import {
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PERMISSIONS_KEY } from '@openthrottle/nestjs-rbac';
import type { Permission } from '@openthrottle/nestjs-rbac';
import { RolesService } from '@openthrottle/nestjs-repositories';

interface RequestWithUser {
  user?: { sub?: string };
}

@Injectable()
export class GqlPermissionsGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // FIXME: APP_ENABLE_AUTHENTICATION is disabled and we're not checking for it here.
    const isAuthEnabled = process.env.APP_ENABLE_AUTHENTICATION === 'true';
    if (!isAuthEnabled) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = this.getRequest(context) as RequestWithUser;
    const user = request.user;

    if (!user?.sub) {
      if (process.env.APP_ENABLE_AUTHENTICATION !== 'true') {
        return true;
      }

      throw new ForbiddenException('Authentication required');
    }

    const userPermissions = await this.rolesService.getPermissionsForUser(
      user.sub,
    );

    const set = new Set(userPermissions);

    for (const permission of requiredPermissions) {
      if (!set.has(permission)) {
        throw new ForbiddenException(
          `Missing permission: ${permission}. Required: ${requiredPermissions.join(', ')}`,
        );
      }
    }
    return true;
  }

  private getRequest(context: ExecutionContext): unknown {
    if ((context.getType() as string) === 'graphql') {
      const ctx = GqlExecutionContext.create(context);

      return ctx.getContext<{ req: unknown }>().req;
    }

    return context.switchToHttp().getRequest();
  }
}
