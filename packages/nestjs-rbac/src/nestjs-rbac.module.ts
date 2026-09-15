import { Module } from '@nestjs/common';

import { PermissionsGuard } from './guards/permissions.guard.ts';
import { RolesGuard } from './guards/roles.guard.ts';

@Module({
  controllers: [],
  exports: [RolesGuard, PermissionsGuard],
  imports: [],
  providers: [RolesGuard, PermissionsGuard],
})
export class NestjsRbacModule {}
