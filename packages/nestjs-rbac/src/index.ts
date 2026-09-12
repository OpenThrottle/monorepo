export { type CorsOptions, getCorsConfiguration, getCorsOptions } from './cors';
export {
  Permissions,
  PERMISSIONS_KEY,
} from './decorators/permissions.decorator';
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export { PermissionsGuard } from './guards/permissions.guard';
export { type RbacUser, RolesGuard } from './guards/roles.guard';
export { NestjsRbacModule } from './nestjs-rbac.module';
export {
  type Permission,
  PERMISSIONS,
  type Role,
  ROLE_PERMISSIONS,
  roleHasPermission,
  ROLES,
} from './roles';
