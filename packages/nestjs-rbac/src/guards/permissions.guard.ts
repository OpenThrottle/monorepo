import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { roleHasPermission, ROLE_PERMISSIONS } from '../roles';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { Permission } from '../roles';
import type { RbacUser } from './roles.guard';

/**
 * @description Guard that enforces permission-based access. Use with @Permissions() and after an auth guard.
 * Reads the authenticated user from request.user, checks the user's roles against the permission mapping,
 * and requires the user to have all of the specified permissions (via any of their roles).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RbacUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const userRoles = user.roles ?? [];
    if (userRoles.length === 0) {
      throw new ForbiddenException(
        `No roles assigned. Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    for (const permission of requiredPermissions) {
      const hasPermission = userRoles.some((role) =>
        roleHasPermission(role, permission, ROLE_PERMISSIONS),
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          `Missing permission: ${permission}. Required: ${requiredPermissions.join(', ')}`,
        );
      }
    }
    return true;
  }
}
