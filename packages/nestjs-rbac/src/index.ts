export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export {
  Permissions,
  PERMISSIONS_KEY,
} from './decorators/permissions.decorator';
export { getCorsConfiguration, getCorsOptions, type CorsOptions } from './cors';
export { PermissionsGuard } from './guards/permissions.guard';
export { RolesGuard, type RbacUser } from './guards/roles.guard';
export { NestjsRbacModule } from './nestjs-rbac.module';
export { NestjsRbacService } from './nestjs-rbac.service';
export {
  PERMISSIONS,
  type Permission,
  roleHasPermission,
  ROLE_PERMISSIONS,
  ROLES,
  type Role,
} from './roles';
