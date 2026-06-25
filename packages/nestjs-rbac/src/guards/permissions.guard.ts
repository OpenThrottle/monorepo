import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { roleHasPermission, ROLE_PERMISSIONS } from '../roles';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { Permission, Role } from '../roles';
import type { RbacUser } from './roles.guard';

/**
 * @description Guard that enforces permission-based access. Use with @Permissions() and after an auth guard.
 * Reads the authenticated user from request.user, checks the user's roles against the permission mapping,
 * and requires the user to have all of the specified permissions (via any of their roles).
 *
 * ⚠️ SEMANTICS — ALL permissions are required (logical AND).
 * `@Permissions(A, B)` grants access only if the user has BOTH A and B. This is intentionally
 * asymmetric with {@link RolesGuard}, which requires only ONE of the listed roles (logical OR).
 * If you expect OR semantics here (access when the user has any one of the listed permissions),
 * this guard will NOT do that — it is stricter (fail-closed). There is no OR mode today; if
 * OR-permissions is ever needed, add an explicit opt-in (e.g. a `requireAll: false` option) rather
 * than relaxing this default.
 *
 * ⚠️ SECURITY WARNING — JWT-claim-based authorization.
 * This guard derives permissions from `request.user.roles` (a client-asserted JWT claim fixed at
 * token-mint time) resolved against the static {@link ROLE_PERMISSIONS} map. It does NOT consult any
 * server-side source of truth. If roles are mutable server-side (revoked/changed after a token is
 * issued) or if the `roles` claim is otherwise untrusted, this guard is a privilege-escalation hazard:
 * a stale or forged claim grants access until the token expires.
 *
 * MUST NOT be used where roles/permissions are managed in a database or are otherwise mutable after
 * token issuance. In openthrottle-server, the canonical enforcer is `GqlPermissionsGuard`
 * (applications/openthrottle-server/src/guards/gql-permissions.guard.ts), which resolves permissions
 * from the DB via `RolesService.getPermissionsForUser` / `getPermissionsForServiceAccount`.
 *
 * Only safe for apps whose authorization model is genuinely "JWT claim + static map" with immutable
 * roles for a token's lifetime.
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

    // Defensive: see RolesGuard. A non-array `roles` claim (e.g. a hand-crafted JWT with
    // `roles: "admin"`) is treated as "no roles" rather than trusted — a bare string has no
    // `.some` and would otherwise throw, and string `.includes` does unsafe substring matching.
    const userRoles: readonly Role[] = Array.isArray(user.roles)
      ? user.roles
      : [];
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
