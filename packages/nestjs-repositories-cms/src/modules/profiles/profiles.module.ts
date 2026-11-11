import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Profile } from './profile.entity.ts';
import { ProfilesService } from './profiles.service.ts';

/**
 * @description Registers {@link Profile} on the cms connection and provides
 * {@link ProfilesService}.
 * @public
 */
@Module({
  exports: [ProfilesService],
  imports: [TypeOrmModule.forFeature([Profile], CMS_CONNECTION)],
  providers: [ProfilesService],
})
export class ProfilesModule {}
