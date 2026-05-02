import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { NestjsRbacService } from './nestjs-rbac.service';

@Module({
  controllers: [],
  exports: [NestjsRbacService, RolesGuard, PermissionsGuard],
  imports: [LoggerModule],
  providers: [NestjsRbacService, RolesGuard, PermissionsGuard],
})
export class NestjsRbacModule {}
