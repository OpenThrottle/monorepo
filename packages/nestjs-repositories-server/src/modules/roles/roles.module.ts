import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Permission } from '../permissions/permission.entity.ts';
import { ServiceAccount } from '../service-accounts/service-account.entity.ts';
import { User } from '../users/user.entity.ts';
import { Role } from './role.entity.ts';
import { RolesRepository } from './roles.repository.ts';

/**
 * @description Registers {@link Role} (plus the {@link User}, {@link ServiceAccount} and
 * {@link Permission} entities its assignment methods read) on the default connection and
 * provides {@link RolesRepository}.
 * @public
 */
@Module({
  exports: [RolesRepository],
  imports: [TypeOrmModule.forFeature([Permission, Role, ServiceAccount, User])],
  providers: [RolesRepository],
})
export class RolesModule {}
