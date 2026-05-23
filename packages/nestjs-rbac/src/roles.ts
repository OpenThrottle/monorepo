/**
 * RBAC roles and permissions model. Roles and permissions are defined in package
 * constants; guards use this mapping to enforce access. Apps can override or
 * extend via config or by loading from a DB and passing to guards.
 *
 * @see README.md for mapping and storage documentation.
 */

/** Built-in role identifiers. */
export const ROLES = {
  ADMIN: 'admin',
  MCP: 'mcp',
  USER: 'user',
  VIEWER: 'viewer',
  WORKFLOW_RALPH: 'workflow-ralph',
} as const;

/** Role type (one of the keys of ROLES). */
export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Built-in permission identifiers (resource:action style). */
export const PERMISSIONS = {
  PLANS_READ: 'plans:read',
  PLANS_WRITE: 'plans:write',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
} as const;

/** Permission type (one of the values of PERMISSIONS). */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Default mapping: which permissions each role has. Stored in package config;
 * guards use this (or an app-provided mapping) to check access.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_WRITE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
  ],
  [ROLES.USER]: [
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_WRITE,
    PERMISSIONS.USERS_READ,
  ],
  [ROLES.VIEWER]: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.USERS_READ],
  [ROLES.MCP]: [PERMISSIONS.PLANS_READ, PERMISSIONS.PLANS_WRITE],
  [ROLES.WORKFLOW_RALPH]: [PERMISSIONS.PLANS_READ, PERMISSIONS.PLANS_WRITE],
};

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
