import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../roles';

/** Metadata key for required permissions on a route. */
export const PERMISSIONS_KEY = 'permissions';

/**
 * @description Marks a route as requiring one or more permissions. Use with {@link PermissionsGuard}.
 * Must be used after an auth guard (e.g. JwtAuthGuard) so request.user is set.
 * The guard checks the user's role(s) against the permission mapping.
 *
 * @example
 * ```ts
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permissions(PERMISSIONS.USERS_WRITE)
 * @Post('users')
 * createUser() { ... }
 * ```
 *
 * @example Multiple permissions (user needs all)
 * ```ts
 * @Permissions(PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE)
 * @Put('settings')
 * updateSettings() { ... }
 * ```
 */
export const Permissions = (
  ...permissions: Permission[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions);
