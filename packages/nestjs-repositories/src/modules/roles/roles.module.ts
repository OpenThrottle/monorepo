/**
 * @description NestJS module for roles and permissions. Exports RolesService and PermissionsService.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { ServiceAccount } from '../service-accounts/service-account.entity.ts';
import { User } from '../users/user.entity.ts';
import { Permission } from './permission.entity.ts';
import { PermissionsService } from './permissions.service.ts';
import { Role } from './role.entity.ts';
import { RolesService } from './roles.service.ts';

@Module({
  controllers: [],
  exports: [PermissionsService, RolesService],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([Permission, Role, ServiceAccount, User]),
  ],
  providers: [PermissionsService, RolesService],
})
export class RolesModule {}
