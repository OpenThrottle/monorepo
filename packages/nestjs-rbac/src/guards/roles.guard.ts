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
 *
 * ⚠️ SEMANTICS — ANY one role is sufficient (logical OR).
 * `@Roles(A, B)` grants access if the user has EITHER A or B. This is intentionally asymmetric with
 * {@link PermissionsGuard}, which requires ALL listed permissions (logical AND). Keep this difference
 * in mind when scoping routes: roles are OR, permissions are AND.
 *
 * ⚠️ SECURITY WARNING — JWT-claim-based authorization.
 * This guard trusts `request.user.roles` (a client-asserted JWT claim fixed at token-mint time) as the
 * sole source of truth. It does NOT consult any server-side store. If roles are mutable server-side
 * (revoked/changed after a token is issued) or the `roles` claim is otherwise untrusted, this guard is a
 * privilege-escalation hazard: a stale or forged claim grants access until the token expires.
 *
 * MUST NOT be used where roles are managed in a database or are otherwise mutable after token issuance.
 * In openthrottle-server, the canonical enforcer is `GqlPermissionsGuard`
 * (applications/openthrottle-server/src/guards/gql-permissions.guard.ts), which resolves permissions from
 * the DB via `RolesService.getPermissionsForUser` / `getPermissionsForServiceAccount`.
 *
 * Only safe for apps whose authorization model is genuinely "JWT claim + static map" with immutable roles
 * for a token's lifetime.
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

    // Defensive: nestjs-auth normalizes roles to a string[] via parseOptionalStringArray,
    // but a consumer that bypasses it (e.g. a hand-crafted JWT with `roles: "admin"`) could
    // pass a non-array. A raw string would make `.includes` do substring matching, allowing
    // false positives. Treat any non-array as "no roles".
    const userRoles: readonly Role[] = Array.isArray(user.roles)
      ? user.roles
      : [];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      const message = `Insufficient role. Required one of: ${requiredRoles.join(', ')}`;

      throw new ForbiddenException(message);
    }

    return true;
  }
}
