/**
 * @description NestJS module for roles and permissions. Exports RolesService and PermissionsService.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { User } from '../users/user.entity';
import { Permission } from './permission.entity';
import { PermissionsService } from './permissions.service';
import { Role } from './role.entity';
import { RolesService } from './roles.service';

@Module({
  controllers: [],
  exports: [PermissionsService, RolesService],
  imports: [LoggerModule, TypeOrmModule.forFeature([Permission, Role, User])],
  providers: [PermissionsService, RolesService],
})
export class RolesModule {}
