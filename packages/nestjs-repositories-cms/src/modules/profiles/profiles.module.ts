import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Profile } from './profile.entity.ts';
import { ProfilesRepository } from './profiles.repository.ts';

/**
 * @description Registers {@link Profile} on the cms connection and provides
 * {@link ProfilesRepository}.
 * @public
 */
@Module({
  exports: [ProfilesRepository],
  imports: [TypeOrmModule.forFeature([Profile], CMS_CONNECTION)],
  providers: [ProfilesRepository],
})
export class ProfilesModule {}
