import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Permission } from './permission.entity.ts';
import { PermissionsRepository } from './permissions.repository.ts';

/**
 * @description Registers {@link Permission} on the default connection and provides
 * {@link PermissionsRepository}.
 * @public
 */
@Module({
  exports: [PermissionsRepository],
  imports: [TypeOrmModule.forFeature([Permission])],
  providers: [PermissionsRepository],
})
export class PermissionsModule {}
