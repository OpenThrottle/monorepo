import { ROLE_PERMISSIONS } from './roles.constants.ts';
import type { Permission, Role } from './roles.types.ts';

/**
 * @description Returns whether the given role has the given permission.
 */
export function roleHasPermission(
  role: Role,
  permission: Permission,
  mapping: Readonly<Record<Role, readonly Permission[]>> = ROLE_PERMISSIONS,
): boolean {
  const permissions = mapping[role];
  return permissions !== undefined && permissions.includes(permission);
}
