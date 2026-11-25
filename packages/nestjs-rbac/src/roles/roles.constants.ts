import type { Permission, Role } from './roles.types.ts';
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
  PLAN_RUNNER: 'plan-runner',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

export type RolesKey = keyof typeof ROLES;
export type RolesValue = (typeof ROLES)[RolesKey];

/** Built-in permission identifiers (resource:action style). */
export const PERMISSIONS = {
  BLOG_DRAFT: 'blog:draft',
  BLOG_WRITE: 'blog:write',
  CMS_WRITE: 'cms:write',
  CODE_READ: 'code:read',
  FLAGS_READ: 'flags:read',
  FLAGS_WRITE: 'flags:write',
  PLANS_READ: 'plans:read',
  PLANS_WRITE: 'plans:write',
  SCHEDULES_READ: 'schedules:read',
  SCHEDULES_WRITE: 'schedules:write',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
} as const;

export type PermissionsKey = keyof typeof PERMISSIONS;
export type PermissionsValue = (typeof PERMISSIONS)[PermissionsKey];

/**
 * Default / seed mapping ONLY: which permissions each built-in role has.
 *
 * This static table is NOT the production source of truth. Apps with a
 * database-backed authorization model (e.g. openthrottle-server, which resolves
 * permissions via `RolesRepository` and enforces them through `GqlPermissionsGuard`)
 * MUST NOT rely on this map. It exists solely as the built-in default for the
 * package's JWT-claim-based {@link RolesGuard} / {@link PermissionsGuard}, and as
 * a seed/reference for apps that have no DB. Pass a custom mapping to
 * {@link roleHasPermission} (third argument) to override.
 *
 * @see README.md — keep the documented mapping in sync with this table.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  // Admin is always the full superset — derived from PERMISSIONS rather than
  // enumerated, so any newly-added permission is granted automatically and this
  // mapping can never drift behind the "Full access (all permissions)" contract
  // (mirrors the DB seed's `CROSS JOIN permissions` for admin in migration 034).
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.USER]: [
    PERMISSIONS.CODE_READ,
    PERMISSIONS.FLAGS_READ,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.SCHEDULES_WRITE,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_WRITE,
    PERMISSIONS.USERS_READ,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.CODE_READ,
    PERMISSIONS.FLAGS_READ,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.USERS_READ,
  ],
  [ROLES.MCP]: [
    PERMISSIONS.BLOG_DRAFT,
    PERMISSIONS.CODE_READ,
    PERMISSIONS.PLANS_READ,
    PERMISSIONS.PLANS_WRITE,
    PERMISSIONS.SCHEDULES_READ,
    PERMISSIONS.SCHEDULES_WRITE,
  ],
  [ROLES.PLAN_RUNNER]: [PERMISSIONS.PLANS_READ, PERMISSIONS.PLANS_WRITE],
};
