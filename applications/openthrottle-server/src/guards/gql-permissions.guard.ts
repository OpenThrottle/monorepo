/**
 * @description Guard that enforces permission-based access using DB-backed roles.
 * Use with @Permissions() from @openthrottle/nestjs-rbac after {@link GlobalAuthGuard}
 * so `request.user` is a normalized {@link AuthPrincipal} (human JWT or service account).
 */

import {
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  getAuthPrincipalFromRequest,
  getRequestFromExecutionContext,
} from '@openthrottle/nestjs-auth';
import { PERMISSIONS_KEY } from '@openthrottle/nestjs-rbac';
import type { Permission } from '@openthrottle/nestjs-rbac';
import { RolesService } from '@openthrottle/nestjs-repositories';

@Injectable()
export class GqlPermissionsGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = getRequestFromExecutionContext(context);
    const principal = getAuthPrincipalFromRequest(request);

    if (principal == null) {
      throw new ForbiddenException('Authentication required');
    }

    const principalPermissions =
      principal.kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT
        ? await this.rolesService.getPermissionsForServiceAccount(principal.sub)
        : await this.rolesService.getPermissionsForUser(principal.sub);

    const set = new Set(principalPermissions);

    for (const permission of requiredPermissions) {
      if (!set.has(permission)) {
        throw new ForbiddenException(
          `Missing permission: ${permission}. Required: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    return true;
  }
}
