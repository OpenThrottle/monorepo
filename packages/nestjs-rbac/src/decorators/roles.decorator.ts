import { SetMetadata } from '@nestjs/common';
import type { Role } from '../roles';

/** Metadata key for required roles on a route. */
export const ROLES_KEY = 'roles';

/**
 * @description Marks a route as requiring one or more roles. Use with {@link RolesGuard}.
 * Must be used after an auth guard (e.g. JwtAuthGuard) so request.user is set.
 *
 * @example
 * ```ts
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(ROLES.ADMIN)
 * @Get('admin-only')
 * adminOnly() { return { ok: true }; }
 * ```
 *
 * @example Multiple roles (user needs any one)
 * ```ts
 * @Roles(ROLES.ADMIN, ROLES.USER)
 * @Get('editors')
 * editors() { ... }
 * ```
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
