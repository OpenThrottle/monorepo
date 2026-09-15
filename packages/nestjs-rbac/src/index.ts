export {
  type CorsOptions,
  getCorsConfiguration,
  getCorsOptions,
} from './cors.ts';
export {
  Permissions,
  PERMISSIONS_KEY,
} from './decorators/permissions.decorator.ts';
export { Roles, ROLES_KEY } from './decorators/roles.decorator.ts';
export { PermissionsGuard } from './guards/permissions.guard.ts';
export { type RbacUser, RolesGuard } from './guards/roles.guard.ts';
export { NestjsRbacModule } from './nestjs-rbac.module.ts';
export {
  type Permission,
  PERMISSIONS,
  type Role,
  ROLE_PERMISSIONS,
  roleHasPermission,
  ROLES,
} from './roles.ts';
