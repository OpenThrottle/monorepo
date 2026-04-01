import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../roles';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Minimal user shape with roles for RBAC. Auth (nestjs-auth) attaches this to request.user. */
export interface RbacUser {
  readonly roles?: readonly Role[];
}

/**
 * @description Guard that enforces role-based access. Use with @Roles() and after an auth guard.
 * Reads the authenticated user from request.user and checks that the user has at least one of the required roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RbacUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const userRoles = user.roles ?? [];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      const message = `Insufficient role. Required one of: ${requiredRoles.join(', ')}`;

      throw new ForbiddenException(message);
    }

    return true;
  }
}
