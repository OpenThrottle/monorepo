import { Module } from '@nestjs/common';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  controllers: [],
  exports: [RolesGuard, PermissionsGuard],
  imports: [],
  providers: [RolesGuard, PermissionsGuard],
})
export class NestjsRbacModule {}
